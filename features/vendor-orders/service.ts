import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { getVendorContext } from "@/features/vendors/service";
import * as inventoryRepo from "@/features/inventory/repository";
import * as repo from "./repository";
import type { VendorOrderStatus } from "@prisma/client";
import type { CreateVendorOrderInput, ListVendorOrdersInput } from "./schemas";

const VAT_RATE_BPS = 500; // 5.00% UAE VAT, expressed in basis points
const RESERVATION_TTL_HOURS = 24;

function calcVat(subtotalMinorUnits: number): number {
  return Math.round((subtotalMinorUnits * VAT_RATE_BPS) / 10000);
}

async function requireOrdersContext(userId: string) {
  const context = await getVendorContext(userId);
  if (!context) throw new NotFoundError("Vendor organization");
  if (!hasPermission(context.membershipRole, PERMISSIONS.VENDOR_ORDERS_MANAGE)) {
    throw new ForbiddenError("You do not have permission to manage orders.");
  }
  return context;
}

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof repo.getOrderById>>>;

async function releaseOrderReservations(
  tx: Parameters<typeof inventoryRepo.releaseReservedStock>[0],
  order: OrderWithItems,
  reason: string,
) {
  for (const item of order.items) {
    const updatedItem = await inventoryRepo.releaseReservedStock(
      tx,
      item.inventoryItemId,
      item.quantity,
    );
    if (item.reservationId) {
      await inventoryRepo.markReservationStatus(tx, item.reservationId, "RELEASED");
    }
    await inventoryRepo.createStockAdjustmentRecord(tx, {
      inventoryItemId: item.inventoryItemId,
      changeType: "RESERVATION_RELEASED",
      qtyAvailableDelta: item.quantity,
      qtyReservedDelta: -item.quantity,
      qtyAvailableAfter: updatedItem.qtyAvailable,
      qtyReservedAfter: updatedItem.qtyReserved,
      qtyDamagedAfter: updatedItem.qtyDamaged,
      reason,
    });
  }
}

async function cancelOrderInternal(
  order: OrderWithItems,
  changedById: string | null,
  reason: string,
) {
  return db.$transaction(async (tx) => {
    await releaseOrderReservations(tx, order, reason);
    return repo.updateOrderStatus(tx, order.id, {
      fromStatus: order.status,
      status: "CANCELLED",
      timestampField: "cancelledAt",
      cancelledReason: reason,
      changedById,
      note: reason,
    });
  });
}

/** Lazily expires PENDING_CONFIRMATION orders whose 24h reservation window has
 * passed — no scheduled job exists yet, so this runs opportunistically whenever
 * a vendor lists/reads their orders (ADR pending for a real job queue). */
async function autoExpireStaleOrders(vendorId: string) {
  const cutoff = new Date(Date.now() - RESERVATION_TTL_HOURS * 60 * 60 * 1000);
  const stale = await repo.findStalePendingOrders(vendorId, cutoff);
  for (const order of stale) {
    await cancelOrderInternal(order, null, "Reservation expired — not confirmed in time");
  }
}

// ── Customer: place / view / cancel ──────────────────────────────────────────

export async function placeOrder(customerId: string, input: CreateVendorOrderInput) {
  const inventoryItems = await db.inventoryItem.findMany({
    where: { id: { in: input.items.map((i) => i.inventoryItemId) } },
    include: { part: true },
  });

  if (inventoryItems.length !== input.items.length) {
    throw new NotFoundError("One or more inventory items");
  }
  if (inventoryItems.some((i) => !i.isActive)) {
    throw new ValidationError("One or more items are no longer available.");
  }

  const [firstItem] = inventoryItems;
  if (!firstItem) throw new NotFoundError("One or more inventory items");
  const vendorId = firstItem.vendorId;
  const locationId = firstItem.locationId;
  const currency = firstItem.currency;
  if (inventoryItems.some((i) => i.vendorId !== vendorId || i.locationId !== locationId)) {
    throw new ValidationError("All items in one order must come from the same vendor location.");
  }

  const quantityByItem = new Map(input.items.map((i) => [i.inventoryItemId, i.quantity]));
  const subtotalMinorUnits = inventoryItems.reduce(
    (sum, item) => sum + item.priceMinorUnits * (quantityByItem.get(item.id) ?? 0),
    0,
  );
  const vatMinorUnits = calcVat(subtotalMinorUnits);
  const orderNumber = repo.generateOrderNumber();

  const order = await db.$transaction(async (tx) => {
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_HOURS * 60 * 60 * 1000);
    const orderItems = [];

    for (const item of inventoryItems) {
      const quantity = quantityByItem.get(item.id) ?? 0;
      const updatedItem = await inventoryRepo.reserveAvailableStock(tx, item.id, quantity);
      const reservation = await inventoryRepo.createReservation(tx, {
        inventoryItemId: item.id,
        quantity,
        expiresAt,
        createdById: customerId,
      });
      await inventoryRepo.createStockAdjustmentRecord(tx, {
        inventoryItemId: item.id,
        changeType: "RESERVATION",
        qtyAvailableDelta: -quantity,
        qtyReservedDelta: quantity,
        qtyAvailableAfter: updatedItem.qtyAvailable,
        qtyReservedAfter: updatedItem.qtyReserved,
        qtyDamagedAfter: updatedItem.qtyDamaged,
        performedById: customerId,
      });
      orderItems.push({
        inventoryItemId: item.id,
        partId: item.partId,
        partNameSnapshot: item.part.name,
        quantity,
        unitPriceMinorUnits: item.priceMinorUnits,
        totalMinorUnits: item.priceMinorUnits * quantity,
        reservationId: reservation.id,
      });
    }

    return repo.createOrder(tx, {
      orderNumber,
      customerId,
      vendorId,
      locationId,
      subtotalMinorUnits,
      vatMinorUnits,
      totalMinorUnits: subtotalMinorUnits + vatMinorUnits,
      currency,
      deliveryAddressLine1: input.deliveryAddressLine1,
      deliveryEmirate: input.deliveryEmirate,
      contactPhone: input.contactPhone,
      items: orderItems,
    });
  });

  await repo.createAuditLog({
    userId: customerId,
    action: "VENDOR_ORDER_PLACED",
    resourceId: order.id,
    metadata: { orderNumber: order.orderNumber, totalMinorUnits: order.totalMinorUnits },
  });

  return order;
}

export async function listMyOrders(customerId: string, input: ListVendorOrdersInput) {
  return repo.listOrdersForCustomer(customerId, input);
}

export async function getMyOrderDetail(customerId: string, orderId: string) {
  const order = await repo.getOrderForCustomer(orderId, customerId);
  if (!order) throw new NotFoundError("Order");
  return order;
}

export async function cancelMyOrder(customerId: string, orderId: string, reason: string) {
  const order = await repo.getOrderForCustomer(orderId, customerId);
  if (!order) throw new NotFoundError("Order");
  if (order.status !== "PENDING_CONFIRMATION") {
    throw new ConflictError("This order can no longer be cancelled.");
  }

  const updated = await cancelOrderInternal(order, customerId, reason);
  await repo.createAuditLog({
    userId: customerId,
    action: "VENDOR_ORDER_CANCELLED",
    resourceId: orderId,
    metadata: { reason },
  });
  return updated;
}

// ── Vendor: view / progress the order lifecycle ──────────────────────────────

export async function listVendorOrders(userId: string, input: ListVendorOrdersInput) {
  const context = await requireOrdersContext(userId);
  await autoExpireStaleOrders(context.vendorId);
  return repo.listOrdersForVendor(context.vendorId, input);
}

export async function getVendorOrderDetail(userId: string, orderId: string) {
  const context = await requireOrdersContext(userId);
  await autoExpireStaleOrders(context.vendorId);
  const order = await repo.getOrderForVendor(orderId, context.vendorId);
  if (!order) throw new NotFoundError("Order");
  return order;
}

async function transitionOrder(
  userId: string,
  orderId: string,
  vendorId: string,
  opts: {
    expectedStatus: VendorOrderStatus;
    nextStatus: VendorOrderStatus;
    timestampField: "confirmedAt" | "preparedAt" | "readyAt";
    note: string;
  },
) {
  const order = await repo.getOrderForVendor(orderId, vendorId);
  if (!order) throw new NotFoundError("Order");
  if (order.status !== opts.expectedStatus) {
    throw new ConflictError(
      `Order must be ${opts.expectedStatus} for this action (currently ${order.status}).`,
    );
  }

  const updated = await db.$transaction((tx) =>
    repo.updateOrderStatus(tx, orderId, {
      fromStatus: order.status,
      status: opts.nextStatus,
      timestampField: opts.timestampField,
      changedById: userId,
      note: opts.note,
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "VENDOR_ORDER_STATUS_CHANGED",
    resourceId: orderId,
    metadata: { from: opts.expectedStatus, to: opts.nextStatus },
  });
  return updated;
}

export async function confirmOrder(userId: string, orderId: string) {
  const context = await requireOrdersContext(userId);
  return transitionOrder(userId, orderId, context.vendorId, {
    expectedStatus: "PENDING_CONFIRMATION",
    nextStatus: "CONFIRMED",
    timestampField: "confirmedAt",
    note: "Availability confirmed",
  });
}

export async function startPreparingOrder(userId: string, orderId: string) {
  const context = await requireOrdersContext(userId);
  return transitionOrder(userId, orderId, context.vendorId, {
    expectedStatus: "CONFIRMED",
    nextStatus: "PREPARING",
    timestampField: "preparedAt",
    note: "Preparing order",
  });
}

export async function markOrderReady(userId: string, orderId: string) {
  const context = await requireOrdersContext(userId);
  return transitionOrder(userId, orderId, context.vendorId, {
    expectedStatus: "PREPARING",
    nextStatus: "READY_FOR_PICKUP",
    timestampField: "readyAt",
    note: "Ready for pickup",
  });
}

export async function completeOrder(userId: string, orderId: string) {
  const context = await requireOrdersContext(userId);
  const order = await repo.getOrderForVendor(orderId, context.vendorId);
  if (!order) throw new NotFoundError("Order");
  if (order.status !== "READY_FOR_PICKUP") {
    throw new ConflictError(
      `Order must be ready for pickup to complete (currently ${order.status}).`,
    );
  }

  const updated = await db.$transaction(async (tx) => {
    for (const item of order.items) {
      const updatedItem = await inventoryRepo.consumeReservedStock(
        tx,
        item.inventoryItemId,
        item.quantity,
      );
      if (item.reservationId) {
        await inventoryRepo.markReservationStatus(tx, item.reservationId, "CONSUMED");
      }
      await inventoryRepo.createStockAdjustmentRecord(tx, {
        inventoryItemId: item.inventoryItemId,
        changeType: "ORDER_FULFILLED",
        qtyAvailableDelta: 0,
        qtyReservedDelta: -item.quantity,
        qtyAvailableAfter: updatedItem.qtyAvailable,
        qtyReservedAfter: updatedItem.qtyReserved,
        qtyDamagedAfter: updatedItem.qtyDamaged,
        performedById: userId,
      });
    }

    return repo.updateOrderStatus(tx, orderId, {
      fromStatus: order.status,
      status: "COMPLETED",
      timestampField: "completedAt",
      changedById: userId,
      note: "Order completed",
    });
  });

  await repo.createAuditLog({
    userId,
    action: "VENDOR_ORDER_STATUS_CHANGED",
    resourceId: orderId,
    metadata: { to: "COMPLETED" },
  });
  return updated;
}

export async function cancelOrderByVendor(userId: string, orderId: string, reason: string) {
  const context = await requireOrdersContext(userId);
  const order = await repo.getOrderForVendor(orderId, context.vendorId);
  if (!order) throw new NotFoundError("Order");
  if (
    !(["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING"] as VendorOrderStatus[]).includes(
      order.status,
    )
  ) {
    throw new ConflictError("This order can no longer be cancelled.");
  }

  const updated = await cancelOrderInternal(order, userId, reason);
  await repo.createAuditLog({
    userId,
    action: "VENDOR_ORDER_CANCELLED",
    resourceId: orderId,
    metadata: { reason },
  });
  return updated;
}
