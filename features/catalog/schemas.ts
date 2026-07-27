import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

export const partOriginValues = ["OEM", "AFTERMARKET"] as const;
export const partApprovalStateValues = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;

export const createPartCategorySchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Code must be UPPER_SNAKE_CASE"),
  name: z.string().min(1, "Name is required").max(150),
  nameAr: z.string().max(150).optional(),
  sortOrder: z.number().int().optional().default(0),
});
export type CreatePartCategoryInput = z.infer<typeof createPartCategorySchema>;

export const createPartSchema = z.object({
  categoryId: z.string().uuid("A category is required"),
  manufacturerName: z.string().min(1, "Manufacturer is required").max(150),
  partNumber: z.string().min(1, "Part number is required").max(100),
  alternatePartNumbers: z.array(z.string().min(1).max(100)).max(20).optional().default([]),
  name: z.string().min(1, "Part name is required").max(200),
  description: z.string().max(2000).optional(),
  origin: z.enum(partOriginValues),
});
export type CreatePartInput = z.infer<typeof createPartSchema>;

export const updatePartSchema = createPartSchema.partial();
export type UpdatePartInput = z.infer<typeof updatePartSchema>;

export const rejectPartSchema = z.object({
  reason: z.string().min(1, "A rejection reason is required").max(1000),
});
export type RejectPartInput = z.infer<typeof rejectPartSchema>;

export const uploadPartMediaSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024), // 10 MB max
});
export type UploadPartMediaInput = z.infer<typeof uploadPartMediaSchema>;

export const createPartCompatibilitySchema = z
  .object({
    makeName: z.string().min(1, "Make is required").max(100),
    modelName: z.string().min(1, "Model is required").max(100),
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
    trimName: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => !data.yearFrom || !data.yearTo || data.yearFrom <= data.yearTo, {
    message: "yearFrom must be less than or equal to yearTo",
    path: ["yearTo"],
  });
export type CreatePartCompatibilityInput = z.infer<typeof createPartCompatibilitySchema>;

export const listAdminPartsSchema = z.object({
  approvalState: z.enum(partApprovalStateValues).optional(),
  categoryId: z.string().uuid().optional(),
  origin: z.enum(partOriginValues).optional(),
  query: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListAdminPartsInput = z.infer<typeof listAdminPartsSchema>;

export const searchPartsSchema = z.object({
  query: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  makeName: z.string().max(100).optional(),
  modelName: z.string().max(100).optional(),
  year: z.coerce
    .number()
    .int()
    .min(1980)
    .max(CURRENT_YEAR + 2)
    .optional(),
  engineCode: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SearchPartsInput = z.infer<typeof searchPartsSchema>;
