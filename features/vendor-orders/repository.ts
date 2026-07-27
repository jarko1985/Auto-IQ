import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { AuditAction, Prisma, VendorOrderStatus } from "@prisma/client";
import type { CreateVendorOrderInput, ListVendorOrdersInput } from "./schemas";

type TxClient = Prisma.TransactionClient;

export function generateOrderNumber(): string {
  return `ORD-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const orderInclude = {
  items: {
    include: {
      inventoryItem: {
        include: {
          location: true,
          part: { select: { partNumber: true, category: { select: { code: true } } } },
        },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  vendor: { select: { id: true, businessName: true } },
  location: true,
  customer: { select: { id: true, name: true, email: true } },
} satisfies Prisma.VendorOrderInclude;

export async function createOrder(
  tx: TxClient,
  data: {
    orderNumber: string;
    customerId: string;
    vendorId: string;
    locationId: string;
    subtotalMinorUnits: number;
    vatMinorUnits: number;
    totalMinorUnits: number;
    currency: string;
    deliveryAddressLine1?: string;
    deliveryEmirate?: CreateVendorOrderInput["deliveryEmirate"];
    contactPhone?: string;
    items: Array<{
      inventoryItemId: string;
      partId: string;
      partNameSnapshot: string;
      quantity: number;
      unitPriceMinorUnits: number;
      totalMinorUnits: number;
      reservationId: string;
    }>;
  },
) {
  const order = await tx.vendorOrder.create({
    data: {
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      vendorId: data.vendorId,
      locationId: data.locationId,
      subtotalMinorUnits: data.subtotalMinorUnits,
      vatMinorUnits: data.vatMinorUnits,
      totalMinorUnits: data.totalMinorUnits,
      currency: data.currency,
      deliveryAddressLine1: data.deliveryAddressLine1,
      deliveryEmirate: data.deliveryEmirate,
      contactPhone: data.contactPhone,
      items: { create: data.items },
      statusHistory: {
        create: {
          toStatus: "PENDING_CONFIRMATION",
          changedById: data.customerId,
          note: "Order placed",
        },
      },
    },
    include: orderInclude,
  });
  return order;
}

export async function getOrderById(id: string) {
  return db.vendorOrder.findUnique({ where: { id }, include: orderInclude });
}

export async function getOrderForVendor(id: string, vendorId: string) {
  return db.vendorOrder.findFirst({ where: { id, vendorId }, include: orderInclude });
}

export async function getOrderForCustomer(id: string, customerId: string) {
  return db.vendorOrder.findFirst({ where: { id, customerId }, include: orderInclude });
}

export async function listOrdersForVendor(vendorId: string, input: ListVendorOrdersInput) {
  const where: Prisma.VendorOrderWhereInput = {
    vendorId,
    ...(input.status && { status: input.status }),
    ...(input.query && {
      OR: [
        { orderNumber: { contains: input.query, mode: "insensitive" } },
        { customer: { name: { contains: input.query, mode: "insensitive" } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    db.vendorOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: orderInclude,
    }),
    db.vendorOrder.count({ where }),
  ]);
  return { orders, total };
}

export async function listOrdersForCustomer(customerId: string, input: ListVendorOrdersInput) {
  const where: Prisma.VendorOrderWhereInput = {
    customerId,
    ...(input.status && { status: input.status }),
  };

  const [orders, total] = await Promise.all([
    db.vendorOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: orderInclude,
    }),
    db.vendorOrder.count({ where }),
  ]);
  return { orders, total };
}

export async function findStalePendingOrders(vendorId: string, cutoff: Date) {
  return db.vendorOrder.findMany({
    where: { vendorId, status: "PENDING_CONFIRMATION", createdAt: { lt: cutoff } },
    include: orderInclude,
  });
}

export async function updateOrderStatus(
  tx: TxClient,
  orderId: string,
  data: {
    fromStatus: VendorOrderStatus;
    status: VendorOrderStatus;
    timestampField?: "confirmedAt" | "preparedAt" | "readyAt" | "completedAt" | "cancelledAt";
    cancelledReason?: string;
    changedById: string | null;
    note?: string;
  },
) {
  const order = await tx.vendorOrder.update({
    where: { id: orderId },
    data: {
      status: data.status,
      ...(data.timestampField && { [data.timestampField]: new Date() }),
      ...(data.cancelledReason !== undefined && { cancelledReason: data.cancelledReason }),
      statusHistory: {
        create: {
          fromStatus: data.fromStatus,
          toStatus: data.status,
          changedById: data.changedById,
          note: data.note,
        },
      },
    },
    include: orderInclude,
  });
  return order;
}

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
