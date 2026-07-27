import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { AuditAction, InventoryChangeType, Prisma } from "@prisma/client";
import type {
  CreateInventoryItemInput,
  ListInventoryAuditInput,
  ListInventoryInput,
} from "./schemas";

type TxClient = Prisma.TransactionClient;

// ── Inventory items ───────────────────────────────────────────────────────────

export async function createInventoryItem(vendorId: string, data: CreateInventoryItemInput) {
  return db.inventoryItem.create({
    data: {
      partId: data.partId,
      vendorId,
      locationId: data.locationId,
      priceMinorUnits: data.priceMinorUnits,
      currency: data.currency,
      qtyAvailable: data.qtyAvailable,
      qtyDamaged: data.qtyDamaged,
      reorderThreshold: data.reorderThreshold,
    },
  });
}

export async function findExistingInventoryItem(
  vendorId: string,
  locationId: string,
  partId: string,
) {
  return db.inventoryItem.findUnique({
    where: { vendorId_locationId_partId: { vendorId, locationId, partId } },
  });
}

export async function getInventoryItemById(id: string, vendorId: string) {
  return db.inventoryItem.findFirst({
    where: { id, vendorId },
    include: { part: { include: { category: true } }, location: true },
  });
}

export async function listInventoryItems(vendorId: string, input: ListInventoryInput) {
  const where: Prisma.InventoryItemWhereInput = {
    vendorId,
    ...(input.locationId && { locationId: input.locationId }),
    ...(input.query && {
      part: {
        OR: [
          { name: { contains: input.query, mode: "insensitive" } },
          { partNumber: { contains: input.query, mode: "insensitive" } },
          { manufacturerName: { contains: input.query, mode: "insensitive" } },
        ],
      },
    }),
  };

  return db.inventoryItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { part: { include: { category: true } }, location: true },
  });
}

export async function updateInventoryItemFields(
  id: string,
  data: { priceMinorUnits?: number; reorderThreshold?: number; isActive?: boolean },
) {
  return db.inventoryItem.update({
    where: { id },
    data: { ...data, version: { increment: 1 } },
  });
}

// ── Guarded stock mutations ───────────────────────────────────────────────────

/** Atomically moves `quantity` from available -> reserved. The WHERE clause's
 * qtyAvailable gte check is evaluated by Postgres as part of the single UPDATE,
 * so concurrent reservations against the same row cannot both succeed past the
 * available balance — this is what prevents overselling (Prompt 14). */
export async function reserveAvailableStock(
  tx: TxClient,
  inventoryItemId: string,
  quantity: number,
) {
  const result = await tx.inventoryItem.updateMany({
    where: { id: inventoryItemId, isActive: true, qtyAvailable: { gte: quantity } },
    data: {
      qtyAvailable: { decrement: quantity },
      qtyReserved: { increment: quantity },
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
    if (!item) throw new NotFoundError("Inventory item");
    if (!item.isActive)
      throw new ConflictError("This item is no longer available from this vendor.");
    throw new ConflictError(`Insufficient stock: only ${item.qtyAvailable} unit(s) available.`);
  }

  return tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
}

/** Releases a reservation back to sellable stock (order cancelled/expired). */
export async function releaseReservedStock(
  tx: TxClient,
  inventoryItemId: string,
  quantity: number,
) {
  const result = await tx.inventoryItem.updateMany({
    where: { id: inventoryItemId, qtyReserved: { gte: quantity } },
    data: {
      qtyReserved: { decrement: quantity },
      qtyAvailable: { increment: quantity },
      version: { increment: 1 },
    },
  });
  if (result.count === 0) throw new ConflictError("Reservation quantity exceeds reserved stock.");
  return tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
}

/** Order completed — reserved stock permanently leaves the warehouse. Available
 * stock was already decremented at reservation time, so only qtyReserved moves. */
export async function consumeReservedStock(
  tx: TxClient,
  inventoryItemId: string,
  quantity: number,
) {
  const result = await tx.inventoryItem.updateMany({
    where: { id: inventoryItemId, qtyReserved: { gte: quantity } },
    data: { qtyReserved: { decrement: quantity }, version: { increment: 1 } },
  });
  if (result.count === 0) throw new ConflictError("Reservation quantity exceeds reserved stock.");
  return tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
}

/** Optimistic-locked manual stock adjustment (restock / correction / damage). */
export async function applyManualAdjustment(
  inventoryItemId: string,
  vendorId: string,
  compute: (current: { qtyAvailable: number; qtyDamaged: number; version: number }) => {
    qtyAvailable: number;
    qtyDamaged: number;
  },
) {
  const current = await db.inventoryItem.findFirst({ where: { id: inventoryItemId, vendorId } });
  if (!current) throw new NotFoundError("Inventory item");

  const next = compute(current);
  if (next.qtyAvailable < 0 || next.qtyDamaged < 0) {
    throw new ConflictError("This adjustment would result in negative stock.");
  }

  const result = await db.inventoryItem.updateMany({
    where: { id: inventoryItemId, version: current.version },
    data: {
      qtyAvailable: next.qtyAvailable,
      qtyDamaged: next.qtyDamaged,
      version: { increment: 1 },
    },
  });
  if (result.count === 0) {
    throw new ConflictError("This item's stock was just changed by someone else. Please retry.");
  }

  return {
    before: current,
    after: await db.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } }),
  };
}

// ── Audit trail ───────────────────────────────────────────────────────────────

export async function createStockAdjustmentRecord(
  client: TxClient,
  data: {
    inventoryItemId: string;
    changeType: InventoryChangeType;
    qtyAvailableDelta: number;
    qtyReservedDelta?: number;
    qtyDamagedDelta?: number;
    qtyAvailableAfter: number;
    qtyReservedAfter: number;
    qtyDamagedAfter: number;
    reason?: string;
    performedById?: string;
  },
) {
  return client.inventoryAdjustment.create({
    data: {
      inventoryItemId: data.inventoryItemId,
      changeType: data.changeType,
      qtyAvailableDelta: data.qtyAvailableDelta,
      qtyReservedDelta: data.qtyReservedDelta ?? 0,
      qtyDamagedDelta: data.qtyDamagedDelta ?? 0,
      qtyAvailableAfter: data.qtyAvailableAfter,
      qtyReservedAfter: data.qtyReservedAfter,
      qtyDamagedAfter: data.qtyDamagedAfter,
      reason: data.reason,
      performedById: data.performedById,
    },
  });
}

/** Public marketplace offers for one part — one row per vendor location that
 * currently stocks it, sorted cheapest-first. */
export async function listOffersForPart(partId: string) {
  return db.inventoryItem.findMany({
    where: { partId, isActive: true, qtyAvailable: { gt: 0 } },
    orderBy: { priceMinorUnits: "asc" },
    include: {
      vendor: { select: { id: true, businessName: true } },
      location: { select: { id: true, name: true, emirate: true, addressLine1: true } },
    },
  });
}

export async function listVendorInventoryAudit(vendorId: string, input: ListInventoryAuditInput) {
  const where: Prisma.InventoryAdjustmentWhereInput = {
    inventoryItem: {
      vendorId,
      ...(input.locationId && { locationId: input.locationId }),
    },
    ...(input.changeType && { changeType: input.changeType }),
  };

  const [entries, total] = await Promise.all([
    db.inventoryAdjustment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: {
        inventoryItem: { include: { part: true, location: true } },
        performedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    db.inventoryAdjustment.count({ where }),
  ]);

  return { entries, total };
}

// ── Reservations ──────────────────────────────────────────────────────────────

export async function createReservation(
  tx: TxClient,
  data: { inventoryItemId: string; quantity: number; expiresAt: Date; createdById: string },
) {
  return tx.inventoryReservation.create({ data });
}

export async function markReservationStatus(
  tx: TxClient,
  id: string,
  status: "RELEASED" | "CONSUMED" | "EXPIRED",
) {
  return tx.inventoryReservation.update({ where: { id }, data: { status } });
}

// ── Audit log (generic) ──────────────────────────────────────────────────────

export async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      resourceId: data.resourceId,
      metadata: data.metadata,
      user: { connect: { id: data.userId } },
    },
  });
}
