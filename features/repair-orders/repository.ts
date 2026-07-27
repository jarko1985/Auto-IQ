import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { AuditAction, Prisma, RepairOrderStatus } from "@prisma/client";
import type { ListRepairOrdersInput } from "./schemas";

type TxClient = Prisma.TransactionClient;

export function generateRepairOrderNumber(): string {
  return `RO-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const repairOrderInclude = {
  vehicle: {
    select: { id: true, makeName: true, modelName: true, year: true, plateNumber: true, vin: true },
  },
  garage: {
    select: {
      id: true,
      organizationId: true,
      businessName: true,
      contactPhone: true,
      contactEmail: true,
    },
  },
  location: { select: { id: true, name: true, emirate: true, addressLine1: true } },
  customer: { select: { id: true, name: true, email: true } },
  leadMechanic: {
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
      mechanicProfile: true,
    },
  },
  jobs: { orderBy: { sortOrder: "asc" as const } },
  parts: { orderBy: { sortOrder: "asc" as const } },
  qualityChecks: { orderBy: { sortOrder: "asc" as const } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  // Sprint 21 — lets the customer-portal detail view know whether a review
  // has already been submitted, without a second query.
  review: { select: { id: true } },
  // Sprint 15 — technical garage-facing summary of the originating diagnostic
  // session's AI result, surfaced in the garage-side RO detail view.
  diagnosticSession: {
    select: { id: true, result: { select: { garageSummary: true, isDegraded: true } } },
  },
} satisfies Prisma.RepairOrderInclude;

// ── Creation source (booking) ────────────────────────────────────────────────

export async function getAcceptedBookingForGarage(bookingId: string, garageId: string) {
  return db.appointment.findFirst({
    where: { id: bookingId, garageId, status: "ACCEPTED" },
    include: { repairOrder: { select: { id: true } } },
  });
}

export async function getTopDiagnosticCause(sessionId: string) {
  const result = await db.diagnosticResult.findUnique({
    where: { sessionId },
    include: { causes: { orderBy: { rank: "asc" }, take: 1 } },
  });
  return result?.causes[0] ?? null;
}

export async function createRepairOrder(data: {
  repairOrderNumber: string;
  customerId: string;
  vehicleId: string;
  garageId: string;
  locationId: string;
  appointmentId: string;
  diagnosticSessionId?: string;
  serviceType: Prisma.RepairOrderCreateInput["serviceType"];
  aiSuggestedDiagnosis?: string;
  aiConfidence?: number;
}) {
  return db.repairOrder.create({
    data: {
      repairOrderNumber: data.repairOrderNumber,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      garageId: data.garageId,
      locationId: data.locationId,
      appointmentId: data.appointmentId,
      diagnosticSessionId: data.diagnosticSessionId,
      serviceType: data.serviceType,
      aiSuggestedDiagnosis: data.aiSuggestedDiagnosis,
      aiConfidence: data.aiConfidence,
      statusHistory: { create: { toStatus: "CREATED", changedById: null, note: "Checked in" } },
    },
    include: repairOrderInclude,
  });
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getById(id: string) {
  return db.repairOrder.findUnique({ where: { id }, include: repairOrderInclude });
}

export async function getForGarage(id: string, garageId: string) {
  return db.repairOrder.findFirst({ where: { id, garageId }, include: repairOrderInclude });
}

export async function getForCustomer(id: string, customerId: string) {
  return db.repairOrder.findFirst({ where: { id, customerId }, include: repairOrderInclude });
}

export async function listForGarage(garageId: string, input: ListRepairOrdersInput) {
  const where: Prisma.RepairOrderWhereInput = {
    garageId,
    ...(input.status && { status: input.status }),
  };
  const [repairOrders, total] = await Promise.all([
    db.repairOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: repairOrderInclude,
    }),
    db.repairOrder.count({ where }),
  ]);
  return { repairOrders, total };
}

export async function listForCustomer(customerId: string, input: ListRepairOrdersInput) {
  const where: Prisma.RepairOrderWhereInput = {
    customerId,
    ...(input.status && { status: input.status }),
  };
  const [repairOrders, total] = await Promise.all([
    db.repairOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: repairOrderInclude,
    }),
    db.repairOrder.count({ where }),
  ]);
  return { repairOrders, total };
}

export async function listMechanicsForGarage(organizationId: string) {
  return db.organizationMembership.findMany({
    where: { organizationId, roles: { some: { role: { name: "MECHANIC" } } } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      mechanicProfile: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

// ── Status transitions ───────────────────────────────────────────────────────

export async function updateStatus(
  tx: TxClient,
  repairOrderId: string,
  data: {
    fromStatus: RepairOrderStatus;
    toStatus: RepairOrderStatus;
    changedById: string | null;
    note?: string;
    fields?: Prisma.RepairOrderUpdateInput;
  },
) {
  return tx.repairOrder.update({
    where: { id: repairOrderId },
    data: {
      status: data.toStatus,
      ...data.fields,
      statusHistory: {
        create: {
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          changedById: data.changedById,
          note: data.note,
        },
      },
    },
    include: repairOrderInclude,
  });
}

export async function updateFields(id: string, fields: Prisma.RepairOrderUpdateInput) {
  return db.repairOrder.update({ where: { id }, data: fields, include: repairOrderInclude });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function createJob(
  repairOrderId: string,
  data: {
    description: string;
    mechanicMembershipId?: string;
    hours: number;
    rateMinorUnits: number;
    totalMinorUnits: number;
    sortOrder: number;
  },
) {
  return db.repairJob.create({ data: { repairOrderId, ...data } });
}

export async function getJob(id: string, repairOrderId: string) {
  return db.repairJob.findFirst({ where: { id, repairOrderId } });
}

export async function updateJob(id: string, data: Prisma.RepairJobUpdateInput) {
  return db.repairJob.update({ where: { id }, data });
}

export async function deleteJob(id: string) {
  return db.repairJob.delete({ where: { id } });
}

export async function countJobs(repairOrderId: string) {
  return db.repairJob.count({ where: { repairOrderId } });
}

// ── Parts ─────────────────────────────────────────────────────────────────────

export async function createPart(
  repairOrderId: string,
  data: {
    partName: string;
    sku?: string;
    quantity: number;
    unitPriceMinorUnits: number;
    totalMinorUnits: number;
    sortOrder: number;
  },
) {
  return db.repairOrderPart.create({ data: { repairOrderId, ...data } });
}

export async function getPart(id: string, repairOrderId: string) {
  return db.repairOrderPart.findFirst({ where: { id, repairOrderId } });
}

export async function updatePart(id: string, data: Prisma.RepairOrderPartUpdateInput) {
  return db.repairOrderPart.update({ where: { id }, data });
}

export async function deletePart(id: string) {
  return db.repairOrderPart.delete({ where: { id } });
}

// ── Quality checks ────────────────────────────────────────────────────────────

export async function createQualityCheckItem(
  repairOrderId: string,
  label: string,
  sortOrder: number,
) {
  return db.qualityCheckItem.create({ data: { repairOrderId, label, sortOrder } });
}

export async function getQualityCheckItem(id: string, repairOrderId: string) {
  return db.qualityCheckItem.findFirst({ where: { id, repairOrderId } });
}

export async function setQualityCheckItemChecked(
  id: string,
  isChecked: boolean,
  checkedById: string | null,
) {
  return db.qualityCheckItem.update({
    where: { id },
    data: {
      isChecked,
      checkedById: isChecked ? checkedById : null,
      checkedAt: isChecked ? new Date() : null,
    },
  });
}

export async function listQualityCheckItems(repairOrderId: string) {
  return db.qualityCheckItem.findMany({ where: { repairOrderId }, orderBy: { sortOrder: "asc" } });
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  userId: string | null;
  action: AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      resourceId: data.resourceId,
      metadata: data.metadata,
      ...(data.userId ? { user: { connect: { id: data.userId } } } : {}),
    },
  });
}
