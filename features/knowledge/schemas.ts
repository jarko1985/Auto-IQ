import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

export const knowledgeDocumentTypeValues = [
  "OEM_MANUAL",
  "SERVICE_BULLETIN",
  "REPAIR_GUIDE",
  "DIAGNOSTIC_REFERENCE",
  "RECALL_NOTICE",
  "OTHER",
] as const;

export const knowledgeApprovalStateValues = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export const uploadKnowledgeDocumentSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    sourceName: z.string().min(1, "Source is required").max(200),
    sourceUrl: z.string().url().optional().or(z.literal("")),
    documentType: z.enum(knowledgeDocumentTypeValues),
    makeName: z.string().max(100).optional(),
    modelName: z.string().max(100).optional(),
    yearFrom: z.coerce
      .number()
      .int()
      .min(1980)
      .max(CURRENT_YEAR + 2)
      .optional(),
    yearTo: z.coerce
      .number()
      .int()
      .min(1980)
      .max(CURRENT_YEAR + 2)
      .optional(),
    engineCode: z.string().max(50).optional(),
    previousVersionId: z.string().uuid().optional(),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(100),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(20 * 1024 * 1024), // 20 MB max
  })
  .refine((data) => !data.yearFrom || !data.yearTo || data.yearFrom <= data.yearTo, {
    message: "yearFrom must be less than or equal to yearTo",
    path: ["yearTo"],
  });

export type UploadKnowledgeDocumentInput = z.infer<typeof uploadKnowledgeDocumentSchema>;

export const listKnowledgeDocumentsSchema = z.object({
  approvalState: z.enum(knowledgeApprovalStateValues).optional(),
  documentType: z.enum(knowledgeDocumentTypeValues).optional(),
  makeName: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListKnowledgeDocumentsInput = z.infer<typeof listKnowledgeDocumentsSchema>;

export const rejectKnowledgeDocumentSchema = z.object({
  reason: z.string().min(1, "A rejection reason is required").max(1000),
});
export type RejectKnowledgeDocumentInput = z.infer<typeof rejectKnowledgeDocumentSchema>;

export const knowledgeSearchSchema = z.object({
  query: z.string().min(1, "Query is required").max(1000),
  documentType: z.enum(knowledgeDocumentTypeValues).optional(),
  makeName: z.string().max(100).optional(),
  modelName: z.string().max(100).optional(),
  year: z.coerce
    .number()
    .int()
    .min(1980)
    .max(CURRENT_YEAR + 2)
    .optional(),
  engineCode: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;
