import { z } from "zod";

export const repairOrderStatusValues = [
  "CREATED",
  "INSPECTION",
  "DIAGNOSIS",
  "ESTIMATE_DRAFT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "IN_REPAIR",
  "QUALITY_CHECK",
  "COMPLETED",
  "INVOICED",
  "CANCELLED",
] as const;

export const repairJobStatusValues = ["PENDING", "IN_PROGRESS", "DONE"] as const;

export const createRepairOrderSchema = z.object({
  bookingId: z.string().uuid(),
});
export type CreateRepairOrderInput = z.infer<typeof createRepairOrderSchema>;

export const listRepairOrdersSchema = z.object({
  status: z.enum(repairOrderStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListRepairOrdersInput = z.infer<typeof listRepairOrdersSchema>;

export const recordInspectionSchema = z.object({
  inspectionNotes: z.string().min(1, "Inspection notes are required").max(2000),
  odometerReadingKm: z.number().int().min(0).max(2_000_000),
});
export type RecordInspectionInput = z.infer<typeof recordInspectionSchema>;

export const recordDiagnosisSchema = z.object({
  confirmedDiagnosis: z.string().min(1, "Confirmed diagnosis is required").max(500),
});
export type RecordDiagnosisInput = z.infer<typeof recordDiagnosisSchema>;

export const assignLeadMechanicSchema = z.object({
  membershipId: z.string().uuid(),
});
export type AssignLeadMechanicInput = z.infer<typeof assignLeadMechanicSchema>;

export const createJobSchema = z.object({
  description: z.string().min(1, "Description is required").max(300),
  mechanicMembershipId: z.string().uuid().optional(),
  hours: z.number().min(0.25).max(200),
  rateMinorUnits: z.number().int().min(0).max(1_000_000),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobLineSchema = z.object({
  description: z.string().min(1).max(300).optional(),
  mechanicMembershipId: z.string().uuid().nullable().optional(),
  hours: z.number().min(0.25).max(200).optional(),
  rateMinorUnits: z.number().int().min(0).max(1_000_000).optional(),
});
export type UpdateJobLineInput = z.infer<typeof updateJobLineSchema>;

export const updateJobStatusSchema = z.object({
  status: z.enum(repairJobStatusValues),
});
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;

export const createPartSchema = z.object({
  partName: z.string().min(1, "Part name is required").max(300),
  sku: z.string().max(100).optional(),
  quantity: z.number().int().min(1).max(9999),
  unitPriceMinorUnits: z.number().int().min(0).max(10_000_000),
});
export type CreatePartInput = z.infer<typeof createPartSchema>;

export const updatePartSchema = z.object({
  partName: z.string().min(1).max(300).optional(),
  sku: z.string().max(100).nullable().optional(),
  quantity: z.number().int().min(1).max(9999).optional(),
  unitPriceMinorUnits: z.number().int().min(0).max(10_000_000).optional(),
});
export type UpdatePartInput = z.infer<typeof updatePartSchema>;

export const sendEstimateSchema = z.object({
  customerNotes: z.string().max(1000).optional(),
});
export type SendEstimateInput = z.infer<typeof sendEstimateSchema>;

export const rejectEstimateSchema = z.object({
  reason: z.string().min(1, "A reason is required").max(500),
});
export type RejectEstimateInput = z.infer<typeof rejectEstimateSchema>;

export const createQualityCheckItemSchema = z.object({
  label: z.string().min(1, "Label is required").max(300),
});
export type CreateQualityCheckItemInput = z.infer<typeof createQualityCheckItemSchema>;

export const toggleQualityCheckItemSchema = z.object({
  isChecked: z.boolean(),
});
export type ToggleQualityCheckItemInput = z.infer<typeof toggleQualityCheckItemSchema>;

export const finalizeInvoiceSchema = z.object({
  warrantyDurationMonths: z.number().int().min(0).max(120).optional(),
  warrantyCoverageItems: z.array(z.string().max(200)).max(20).default([]),
  warrantyTerms: z.string().max(2000).optional(),
  outcomeNotes: z.string().min(1, "Outcome notes are required").max(2000),
});
export type FinalizeInvoiceInput = z.infer<typeof finalizeInvoiceSchema>;

export const cancelRepairOrderSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required").max(500),
});
export type CancelRepairOrderInput = z.infer<typeof cancelRepairOrderSchema>;

export const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
