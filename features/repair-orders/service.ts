import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { getGarageContext } from "@/features/garages/service";
import * as garageRepo from "@/features/garages/repository";
import { ensureInvoiceForRepairOrder } from "@/features/payments/service";
import {
  notifyEstimateApproved,
  notifyEstimateReady,
  notifyRepairCompleted,
  notifyRepairStatusChanged,
} from "@/features/notifications/service";
import * as repo from "./repository";
import type { RepairJobStatus, RepairOrderStatus } from "@prisma/client";
import type {
  AssignLeadMechanicInput,
  CancelRepairOrderInput,
  CreateJobInput,
  CreatePartInput,
  CreateQualityCheckItemInput,
  FinalizeInvoiceInput,
  ListRepairOrdersInput,
  RecordDiagnosisInput,
  RecordInspectionInput,
  RejectEstimateInput,
  SendEstimateInput,
  SubmitReviewInput,
  UpdateJobLineInput,
  UpdateJobStatusInput,
  UpdatePartInput,
} from "./schemas";

const VAT_RATE_BPS = 500; // 5.00% UAE VAT, expressed in basis points

function calcVat(subtotalMinorUnits: number): number {
  return Math.round((subtotalMinorUnits * VAT_RATE_BPS) / 10000);
}

/** Explicit state graph — anything not listed here is an invalid transition. */
const ALLOWED_TRANSITIONS: Record<RepairOrderStatus, RepairOrderStatus[]> = {
  CREATED: ["INSPECTION", "CANCELLED"],
  INSPECTION: ["DIAGNOSIS", "CANCELLED"],
  DIAGNOSIS: ["ESTIMATE_DRAFT", "CANCELLED"],
  ESTIMATE_DRAFT: ["AWAITING_APPROVAL", "CANCELLED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED"],
  REJECTED: ["ESTIMATE_DRAFT", "CANCELLED"],
  APPROVED: ["IN_REPAIR", "CANCELLED"],
  IN_REPAIR: ["QUALITY_CHECK"],
  QUALITY_CHECK: ["IN_REPAIR", "COMPLETED"],
  COMPLETED: ["INVOICED"],
  INVOICED: [],
  CANCELLED: [],
};

/** Statuses during which jobs/parts line items may be added, edited, or removed
 * — the estimate-building phase. Locked once sent for approval so a customer's
 * approved total can never silently change. */
const ESTIMATE_EDITABLE_STATUSES: RepairOrderStatus[] = ["DIAGNOSIS", "ESTIMATE_DRAFT", "REJECTED"];

type RepairOrderWithLines = NonNullable<Awaited<ReturnType<typeof repo.getById>>>;

function assertTransition(current: RepairOrderStatus, next: RepairOrderStatus) {
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new ConflictError(`Cannot move a repair order from ${current} to ${next}.`);
  }
}

function recomputeTotals(ro: Pick<RepairOrderWithLines, "jobs" | "parts">) {
  const laborSubtotalMinorUnits = ro.jobs.reduce((sum, j) => sum + j.totalMinorUnits, 0);
  const partsSubtotalMinorUnits = ro.parts.reduce((sum, p) => sum + p.totalMinorUnits, 0);
  const subtotal = laborSubtotalMinorUnits + partsSubtotalMinorUnits;
  const vatMinorUnits = calcVat(subtotal);
  return {
    laborSubtotalMinorUnits,
    partsSubtotalMinorUnits,
    vatMinorUnits,
    totalMinorUnits: subtotal + vatMinorUnits,
  };
}

async function requireRepairOrderManageContext(userId: string) {
  const context = await getGarageContext(userId);
  if (!context) throw new NotFoundError("Garage organization");
  if (!hasPermission(context.membershipRole, PERMISSIONS.GARAGE_REPAIR_MANAGE)) {
    throw new ForbiddenError("You do not have permission to manage repair orders.");
  }
  return context;
}

async function requireGarageRepairOrder(userId: string, repairOrderId: string) {
  const context = await requireRepairOrderManageContext(userId);
  const ro = await repo.getForGarage(repairOrderId, context.garageId);
  if (!ro) throw new NotFoundError("Repair order");
  return { context, ro };
}

function assertLineItemsEditable(ro: RepairOrderWithLines) {
  if (!ESTIMATE_EDITABLE_STATUSES.includes(ro.status)) {
    throw new ConflictError(
      "Line items can only be edited while the repair order is being diagnosed or estimated.",
    );
  }
}

// ── Creation (from an accepted booking) ──────────────────────────────────────

export async function createRepairOrderFromBooking(userId: string, bookingId: string) {
  const context = await requireRepairOrderManageContext(userId);

  const booking = await repo.getAcceptedBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Accepted booking");
  if (booking.repairOrder) {
    throw new ConflictError("A repair order already exists for this booking.");
  }

  let aiSuggestedDiagnosis: string | undefined;
  let aiConfidence: number | undefined;
  if (booking.diagnosticSessionId) {
    const topCause = await repo.getTopDiagnosticCause(booking.diagnosticSessionId);
    if (topCause) {
      aiSuggestedDiagnosis = topCause.label;
      aiConfidence = topCause.confidence;
    }
  }

  const repairOrderNumber = repo.generateRepairOrderNumber();
  const ro = await repo.createRepairOrder({
    repairOrderNumber,
    customerId: booking.customerId,
    vehicleId: booking.vehicleId,
    garageId: context.garageId,
    locationId: booking.locationId,
    appointmentId: booking.id,
    diagnosticSessionId: booking.diagnosticSessionId ?? undefined,
    serviceType: booking.serviceType,
    aiSuggestedDiagnosis,
    aiConfidence,
  });

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_CREATED",
    resourceId: ro.id,
    metadata: { repairOrderNumber, bookingId },
  });

  return ro;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function listGarageRepairOrders(userId: string, input: ListRepairOrdersInput) {
  const context = await requireRepairOrderManageContext(userId);
  return repo.listForGarage(context.garageId, input);
}

export async function getGarageRepairOrderDetail(userId: string, repairOrderId: string) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  return ro;
}

export async function listGarageMechanics(userId: string) {
  const context = await requireRepairOrderManageContext(userId);
  return repo.listMechanicsForGarage(context.organizationId);
}

export async function listMyRepairOrders(customerId: string, input: ListRepairOrdersInput) {
  return repo.listForCustomer(customerId, input);
}

export async function getMyRepairOrderDetail(customerId: string, repairOrderId: string) {
  const ro = await repo.getForCustomer(repairOrderId, customerId);
  if (!ro) throw new NotFoundError("Repair order");
  return ro;
}

// ── Inspection / diagnosis ───────────────────────────────────────────────────

const INSPECTABLE_STATUSES: RepairOrderStatus[] = ["CREATED", "INSPECTION"];

export async function recordInspection(
  userId: string,
  repairOrderId: string,
  input: RecordInspectionInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (!INSPECTABLE_STATUSES.includes(ro.status)) {
    throw new ConflictError("Inspection can only be recorded before diagnosis is confirmed.");
  }

  const fields = {
    inspectionNotes: input.inspectionNotes,
    odometerReadingKm: input.odometerReadingKm,
    inspectionStartedAt: ro.inspectionStartedAt ?? new Date(),
  };

  if (ro.status === "CREATED") {
    assertTransition(ro.status, "INSPECTION");
    const updated = await db.$transaction((tx) =>
      repo.updateStatus(tx, repairOrderId, {
        fromStatus: ro.status,
        toStatus: "INSPECTION",
        changedById: userId,
        note: "Inspection started",
        fields,
      }),
    );
    await repo.createAuditLog({
      userId,
      action: "REPAIR_ORDER_STATUS_CHANGED",
      resourceId: repairOrderId,
      metadata: { to: "INSPECTION" },
    });
    void notifyRepairStatusChanged(ro.customerId, repairOrderId, {
      repairOrderNumber: ro.repairOrderNumber,
      status: "INSPECTION",
    });
    return updated;
  }

  return repo.updateFields(repairOrderId, fields);
}

const DIAGNOSABLE_STATUSES: RepairOrderStatus[] = ["INSPECTION", "DIAGNOSIS"];

export async function recordDiagnosis(
  userId: string,
  repairOrderId: string,
  input: RecordDiagnosisInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (!DIAGNOSABLE_STATUSES.includes(ro.status)) {
    throw new ConflictError("Diagnosis can only be recorded after inspection has started.");
  }

  const fields = {
    confirmedDiagnosis: input.confirmedDiagnosis,
    diagnosisRecordedAt: ro.diagnosisRecordedAt ?? new Date(),
  };

  if (ro.status === "INSPECTION") {
    assertTransition(ro.status, "DIAGNOSIS");
    const updated = await db.$transaction((tx) =>
      repo.updateStatus(tx, repairOrderId, {
        fromStatus: ro.status,
        toStatus: "DIAGNOSIS",
        changedById: userId,
        note: "Diagnosis recorded",
        fields,
      }),
    );
    await repo.createAuditLog({
      userId,
      action: "REPAIR_ORDER_STATUS_CHANGED",
      resourceId: repairOrderId,
      metadata: { to: "DIAGNOSIS" },
    });
    void notifyRepairStatusChanged(ro.customerId, repairOrderId, {
      repairOrderNumber: ro.repairOrderNumber,
      status: "DIAGNOSIS",
    });
    return updated;
  }

  return repo.updateFields(repairOrderId, fields);
}

// ── Mechanic assignment ──────────────────────────────────────────────────────

const ASSIGNABLE_STATUSES: RepairOrderStatus[] = [
  "CREATED",
  "INSPECTION",
  "DIAGNOSIS",
  "ESTIMATE_DRAFT",
  "AWAITING_APPROVAL",
  "REJECTED",
  "APPROVED",
  "IN_REPAIR",
  "QUALITY_CHECK",
];

export async function assignLeadMechanic(
  userId: string,
  repairOrderId: string,
  input: AssignLeadMechanicInput,
) {
  const { context, ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (!ASSIGNABLE_STATUSES.includes(ro.status)) {
    throw new ConflictError("A lead mechanic cannot be assigned at this stage.");
  }

  const mechanics = await repo.listMechanicsForGarage(context.organizationId);
  const membership = mechanics.find((m) => m.id === input.membershipId);
  if (!membership) throw new NotFoundError("Mechanic");

  const updated = await repo.updateFields(repairOrderId, {
    leadMechanic: { connect: { id: input.membershipId } },
  });

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_MECHANIC_ASSIGNED",
    resourceId: repairOrderId,
    metadata: { membershipId: input.membershipId },
  });

  return updated;
}

// ── Jobs (labor) ──────────────────────────────────────────────────────────────

async function maybeEnterEstimateDraft(userId: string, ro: RepairOrderWithLines) {
  if (ro.status === "DIAGNOSIS" || ro.status === "REJECTED") {
    assertTransition(ro.status, "ESTIMATE_DRAFT");
    await db.$transaction((tx) =>
      repo.updateStatus(tx, ro.id, {
        fromStatus: ro.status,
        toStatus: "ESTIMATE_DRAFT",
        changedById: userId,
        note: "Estimate building started",
      }),
    );
    await repo.createAuditLog({
      userId,
      action: "REPAIR_ORDER_STATUS_CHANGED",
      resourceId: ro.id,
      metadata: { to: "ESTIMATE_DRAFT" },
    });
  }
}

async function recomputeAndSaveTotals(repairOrderId: string) {
  const ro = await repo.getById(repairOrderId);
  if (!ro) throw new NotFoundError("Repair order");
  const totals = recomputeTotals(ro);
  return repo.updateFields(repairOrderId, totals);
}

export async function addJob(userId: string, repairOrderId: string, input: CreateJobInput) {
  const { context, ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertLineItemsEditable(ro);

  if (input.mechanicMembershipId) {
    const mechanics = await repo.listMechanicsForGarage(context.organizationId);
    if (!mechanics.some((m) => m.id === input.mechanicMembershipId)) {
      throw new ValidationError("Selected mechanic is not part of this garage.");
    }
  }

  await maybeEnterEstimateDraft(userId, ro);

  const totalMinorUnits = Math.round(input.hours * input.rateMinorUnits);
  await repo.createJob(repairOrderId, {
    description: input.description,
    mechanicMembershipId: input.mechanicMembershipId,
    hours: input.hours,
    rateMinorUnits: input.rateMinorUnits,
    totalMinorUnits,
    sortOrder: await repo.countJobs(repairOrderId),
  });

  return recomputeAndSaveTotals(repairOrderId);
}

export async function updateJobLine(
  userId: string,
  repairOrderId: string,
  jobId: string,
  input: UpdateJobLineInput,
) {
  const { context, ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertLineItemsEditable(ro);

  const job = await repo.getJob(jobId, repairOrderId);
  if (!job) throw new NotFoundError("Job");

  if (input.mechanicMembershipId) {
    const mechanics = await repo.listMechanicsForGarage(context.organizationId);
    if (!mechanics.some((m) => m.id === input.mechanicMembershipId)) {
      throw new ValidationError("Selected mechanic is not part of this garage.");
    }
  }

  const hours = input.hours ?? job.hours;
  const rateMinorUnits = input.rateMinorUnits ?? job.rateMinorUnits;

  await repo.updateJob(jobId, {
    description: input.description ?? job.description,
    hours,
    rateMinorUnits,
    totalMinorUnits: Math.round(hours * rateMinorUnits),
    ...(input.mechanicMembershipId !== undefined && {
      mechanic: input.mechanicMembershipId
        ? { connect: { id: input.mechanicMembershipId } }
        : { disconnect: true },
    }),
  });

  return recomputeAndSaveTotals(repairOrderId);
}

export async function removeJob(userId: string, repairOrderId: string, jobId: string) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertLineItemsEditable(ro);

  const job = await repo.getJob(jobId, repairOrderId);
  if (!job) throw new NotFoundError("Job");

  await repo.deleteJob(jobId);
  return recomputeAndSaveTotals(repairOrderId);
}

export async function updateJobStatus(
  userId: string,
  repairOrderId: string,
  jobId: string,
  input: UpdateJobStatusInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (ro.status !== "IN_REPAIR") {
    throw new ConflictError(
      "Job progress can only be updated while the repair order is in repair.",
    );
  }

  const job = await repo.getJob(jobId, repairOrderId);
  if (!job) throw new NotFoundError("Job");

  await repo.updateJob(jobId, { status: input.status as RepairJobStatus });
  return repo.getForGarage(repairOrderId, ro.garageId);
}

// ── Parts ─────────────────────────────────────────────────────────────────────

export async function addPart(userId: string, repairOrderId: string, input: CreatePartInput) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertLineItemsEditable(ro);

  await maybeEnterEstimateDraft(userId, ro);

  const totalMinorUnits = input.quantity * input.unitPriceMinorUnits;
  await repo.createPart(repairOrderId, {
    partName: input.partName,
    sku: input.sku,
    quantity: input.quantity,
    unitPriceMinorUnits: input.unitPriceMinorUnits,
    totalMinorUnits,
    sortOrder: await db.repairOrderPart.count({ where: { repairOrderId } }),
  });

  return recomputeAndSaveTotals(repairOrderId);
}

export async function updatePartLine(
  userId: string,
  repairOrderId: string,
  partId: string,
  input: UpdatePartInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertLineItemsEditable(ro);

  const part = await repo.getPart(partId, repairOrderId);
  if (!part) throw new NotFoundError("Part");

  const quantity = input.quantity ?? part.quantity;
  const unitPriceMinorUnits = input.unitPriceMinorUnits ?? part.unitPriceMinorUnits;

  await repo.updatePart(partId, {
    partName: input.partName ?? part.partName,
    sku: input.sku === undefined ? part.sku : input.sku,
    quantity,
    unitPriceMinorUnits,
    totalMinorUnits: quantity * unitPriceMinorUnits,
  });

  return recomputeAndSaveTotals(repairOrderId);
}

export async function removePart(userId: string, repairOrderId: string, partId: string) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertLineItemsEditable(ro);

  const part = await repo.getPart(partId, repairOrderId);
  if (!part) throw new NotFoundError("Part");

  await repo.deletePart(partId);
  return recomputeAndSaveTotals(repairOrderId);
}

// ── Estimate lifecycle ───────────────────────────────────────────────────────

export async function sendEstimate(
  userId: string,
  repairOrderId: string,
  input: SendEstimateInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertTransition(ro.status, "AWAITING_APPROVAL");

  if (ro.jobs.length === 0 && ro.parts.length === 0) {
    throw new ValidationError(
      "Add at least one labor or parts line item before sending an estimate.",
    );
  }

  const totals = recomputeTotals(ro);

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "AWAITING_APPROVAL",
      changedById: userId,
      note: "Estimate sent to customer",
      fields: { ...totals, customerNotes: input.customerNotes, estimateSentAt: new Date() },
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_ESTIMATE_SENT",
    resourceId: repairOrderId,
    metadata: { totalMinorUnits: totals.totalMinorUnits },
  });

  void notifyEstimateReady(ro.customerId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    totalMinorUnits: totals.totalMinorUnits,
    currency: ro.currency,
  });

  return updated;
}

export async function approveEstimate(customerId: string, repairOrderId: string) {
  const ro = await repo.getForCustomer(repairOrderId, customerId);
  if (!ro) throw new NotFoundError("Repair order");
  assertTransition(ro.status, "APPROVED");

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "APPROVED",
      changedById: customerId,
      note: "Customer approved the estimate",
    }),
  );

  await repo.createAuditLog({
    userId: customerId,
    action: "REPAIR_ORDER_APPROVED",
    resourceId: repairOrderId,
  });
  void notifyEstimateApproved(ro.garage.organizationId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    customerName: ro.customer.name ?? "The customer",
  });
  return updated;
}

export async function rejectEstimate(
  customerId: string,
  repairOrderId: string,
  input: RejectEstimateInput,
) {
  const ro = await repo.getForCustomer(repairOrderId, customerId);
  if (!ro) throw new NotFoundError("Repair order");
  assertTransition(ro.status, "REJECTED");

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "REJECTED",
      changedById: customerId,
      note: input.reason,
      fields: { rejectionReason: input.reason },
    }),
  );

  await repo.createAuditLog({
    userId: customerId,
    action: "REPAIR_ORDER_REJECTED",
    resourceId: repairOrderId,
    metadata: { reason: input.reason },
  });
  return updated;
}

// ── Repair / quality check / completion ──────────────────────────────────────

export async function startRepair(userId: string, repairOrderId: string) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertTransition(ro.status, "IN_REPAIR");
  if (!ro.leadMechanicMembershipId) {
    throw new ValidationError("Assign a lead mechanic before starting the repair.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "IN_REPAIR",
      changedById: userId,
      note: "Repair started",
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_STATUS_CHANGED",
    resourceId: repairOrderId,
    metadata: { to: "IN_REPAIR" },
  });
  void notifyRepairStatusChanged(ro.customerId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    status: "IN_REPAIR",
  });
  return updated;
}

export async function addQualityCheckItem(
  userId: string,
  repairOrderId: string,
  input: CreateQualityCheckItemInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (!(["IN_REPAIR", "QUALITY_CHECK"] as RepairOrderStatus[]).includes(ro.status)) {
    throw new ConflictError(
      "Quality-check items can only be added while in repair or under review.",
    );
  }

  const sortOrder = await db.qualityCheckItem.count({ where: { repairOrderId } });
  await repo.createQualityCheckItem(repairOrderId, input.label, sortOrder);
  return repo.getForGarage(repairOrderId, ro.garageId);
}

export async function toggleQualityCheckItem(
  userId: string,
  repairOrderId: string,
  itemId: string,
  isChecked: boolean,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (!(["IN_REPAIR", "QUALITY_CHECK"] as RepairOrderStatus[]).includes(ro.status)) {
    throw new ConflictError(
      "Quality-check items can only be updated while in repair or under review.",
    );
  }

  const item = await repo.getQualityCheckItem(itemId, repairOrderId);
  if (!item) throw new NotFoundError("Quality check item");

  await repo.setQualityCheckItemChecked(itemId, isChecked, userId);
  return repo.getForGarage(repairOrderId, ro.garageId);
}

export async function sendForQualityCheck(userId: string, repairOrderId: string) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertTransition(ro.status, "QUALITY_CHECK");

  const items = await repo.listQualityCheckItems(repairOrderId);
  if (items.length === 0) {
    throw new ValidationError("Add at least one quality-check item before signing off.");
  }
  if (items.some((i) => !i.isChecked)) {
    throw new ValidationError("All quality-check items must be checked before sign-off.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "QUALITY_CHECK",
      changedById: userId,
      note: "Quality check signed off",
      fields: { qcSignedOffBy: { connect: { id: userId } }, qcSignedOffAt: new Date() },
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_QC_SIGNED_OFF",
    resourceId: repairOrderId,
  });
  void notifyRepairStatusChanged(ro.customerId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    status: "QUALITY_CHECK",
  });
  return updated;
}

export async function completeRepairOrder(userId: string, repairOrderId: string) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertTransition(ro.status, "COMPLETED");

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "COMPLETED",
      changedById: userId,
      note: "Repair completed",
      fields: { completedAt: new Date() },
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_COMPLETED",
    resourceId: repairOrderId,
  });
  void notifyRepairCompleted(ro.customerId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    vehicleLabel: `${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
  });
  return updated;
}

export async function finalizeInvoice(
  userId: string,
  repairOrderId: string,
  input: FinalizeInvoiceInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  assertTransition(ro.status, "INVOICED");

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "INVOICED",
      changedById: userId,
      note: "Invoice finalized",
      fields: {
        invoicedAt: new Date(),
        warrantyDurationMonths: input.warrantyDurationMonths,
        warrantyCoverageItems: input.warrantyCoverageItems,
        warrantyTerms: input.warrantyTerms,
        outcomeNotes: input.outcomeNotes,
      },
    }),
  );

  await repo.createAuditLog({ userId, action: "REPAIR_ORDER_INVOICED", resourceId: repairOrderId });
  void notifyRepairStatusChanged(ro.customerId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    status: "INVOICED",
  });

  await ensureInvoiceForRepairOrder({
    repairOrderId,
    garageId: ro.garageId,
    customerId: ro.customerId,
    issuedByUserId: userId,
    subtotalMinorUnits: updated.laborSubtotalMinorUnits + updated.partsSubtotalMinorUnits,
    vatMinorUnits: updated.vatMinorUnits,
    totalMinorUnits: updated.totalMinorUnits,
    currency: updated.currency,
    jobs: updated.jobs.map((j) => ({
      description: j.description,
      hours: j.hours,
      rateMinorUnits: j.rateMinorUnits,
      totalMinorUnits: j.totalMinorUnits,
    })),
    parts: updated.parts.map((p) => ({
      partName: p.partName,
      quantity: p.quantity,
      unitPriceMinorUnits: p.unitPriceMinorUnits,
      totalMinorUnits: p.totalMinorUnits,
    })),
  });

  return updated;
}

export async function verifyRepairOutcome(customerId: string, repairOrderId: string) {
  const ro = await repo.getForCustomer(repairOrderId, customerId);
  if (!ro) throw new NotFoundError("Repair order");
  if (!(["COMPLETED", "INVOICED"] as RepairOrderStatus[]).includes(ro.status)) {
    throw new ConflictError("The repair outcome can only be verified once the repair is complete.");
  }
  if (ro.customerVerifiedOutcomeAt) {
    throw new ConflictError("This repair outcome has already been verified.");
  }

  const updated = await repo.updateFields(repairOrderId, { customerVerifiedOutcomeAt: new Date() });
  await repo.createAuditLog({
    userId: customerId,
    action: "REPAIR_ORDER_OUTCOME_VERIFIED",
    resourceId: repairOrderId,
  });
  return updated;
}

// ── Garage reviews (Sprint 21) ───────────────────────────────────────────────

export async function submitReview(
  customerId: string,
  repairOrderId: string,
  input: SubmitReviewInput,
) {
  const ro = await repo.getForCustomer(repairOrderId, customerId);
  if (!ro) throw new NotFoundError("Repair order");
  if (!ro.customerVerifiedOutcomeAt) {
    throw new ConflictError("You can only rate a garage after verifying the repair outcome.");
  }

  const existing = await garageRepo.findReviewByRepairOrder(repairOrderId);
  if (existing) {
    throw new ConflictError("You have already reviewed this repair order.");
  }

  const review = await db.$transaction((tx) =>
    garageRepo.createReview(tx, {
      garageId: ro.garageId,
      customerId,
      repairOrderId,
      rating: input.rating,
      comment: input.comment,
    }),
  );

  await repo.createAuditLog({
    userId: customerId,
    action: "GARAGE_REVIEW_CREATED",
    resourceId: review.id,
    metadata: { garageId: ro.garageId, rating: input.rating },
  });

  return review;
}

// ── Cancellation ──────────────────────────────────────────────────────────────

const GARAGE_CANCELLABLE_STATUSES: RepairOrderStatus[] = [
  "CREATED",
  "INSPECTION",
  "DIAGNOSIS",
  "ESTIMATE_DRAFT",
  "AWAITING_APPROVAL",
  "REJECTED",
  "APPROVED",
];

export async function cancelRepairOrder(
  userId: string,
  repairOrderId: string,
  input: CancelRepairOrderInput,
) {
  const { ro } = await requireGarageRepairOrder(userId, repairOrderId);
  if (!GARAGE_CANCELLABLE_STATUSES.includes(ro.status)) {
    throw new ConflictError("This repair order can no longer be cancelled.");
  }
  assertTransition(ro.status, "CANCELLED");

  const updated = await db.$transaction((tx) =>
    repo.updateStatus(tx, repairOrderId, {
      fromStatus: ro.status,
      toStatus: "CANCELLED",
      changedById: userId,
      note: input.reason,
      fields: {
        cancelledAt: new Date(),
        cancelledReason: input.reason,
        cancelledBy: { connect: { id: userId } },
      },
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "REPAIR_ORDER_CANCELLED",
    resourceId: repairOrderId,
    metadata: { reason: input.reason },
  });
  void notifyRepairStatusChanged(ro.customerId, repairOrderId, {
    repairOrderNumber: ro.repairOrderNumber,
    status: "CANCELLED",
  });
  return updated;
}
