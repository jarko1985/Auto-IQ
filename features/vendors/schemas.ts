import { z } from "zod";

export const vendorBusinessTypeValues = [
  "SPARE_PARTS_RETAILER",
  "AUTHORIZED_DISTRIBUTOR",
  "SALVAGE_YARD",
  "OTHER",
] as const;

export const emirateValues = [
  "DUBAI",
  "ABU_DHABI",
  "SHARJAH",
  "AJMAN",
  "UMM_AL_QUWAIN",
  "RAS_AL_KHAIMAH",
  "FUJAIRAH",
] as const;

export const vendorDocumentTypeValues = [
  "TRADE_LICENSE",
  "VAT_CERTIFICATE",
  "EMIRATES_ID_FRONT",
  "EMIRATES_ID_BACK",
  "PASSPORT",
  "OTHER",
] as const;

export const staffRoleValues = ["VENDOR_OWNER", "VENDOR_STAFF"] as const;

const uaePhoneRegex = /^\+971[0-9]{8,9}$/;

export const createVendorProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(200),
  businessType: z.enum(vendorBusinessTypeValues),
  tradeLicenseNumber: z.string().min(1, "Trade license number is required").max(50),
  tradeLicenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  contactPersonName: z.string().min(1, "Contact person is required").max(200),
  contactPhone: z.string().regex(uaePhoneRegex, "Must be a valid UAE phone number (+971XXXXXXXXX)"),
  contactEmail: z.string().email("Invalid email address"),
  addressLine1: z.string().min(1, "Street address is required").max(300),
  emirate: z.enum(emirateValues),
});

export type CreateVendorProfileInput = z.infer<typeof createVendorProfileSchema>;

export const updateVendorProfileSchema = createVendorProfileSchema.partial().extend({
  authorizedSignatoryName: z.string().min(1).max(200).optional(),
  authorizedSignatoryEmiratesId: z
    .string()
    .regex(/^\d{3}-\d{4}-\d{7}-\d$/, "Emirates ID must be in the format 784-YYYY-XXXXXXX-X")
    .optional(),
});

export type UpdateVendorProfileInput = z.infer<typeof updateVendorProfileSchema>;

export const uploadVendorDocumentSchema = z.object({
  type: z.enum(vendorDocumentTypeValues),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024), // 10 MB max
});

export type UploadVendorDocumentInput = z.infer<typeof uploadVendorDocumentSchema>;

export const rejectVendorSchema = z.object({
  reason: z.string().min(1, "A rejection reason is required").max(1000),
});

export type RejectVendorInput = z.infer<typeof rejectVendorSchema>;

export const listVendorQueueSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListVendorQueueInput = z.infer<typeof listVendorQueueSchema>;

export const createVendorLocationSchema = z.object({
  name: z.string().min(1, "Location name is required").max(200),
  emirate: z.enum(emirateValues),
  addressLine1: z.string().min(1, "Street address is required").max(300),
  phone: z
    .string()
    .regex(uaePhoneRegex, "Must be a valid UAE phone number (+971XXXXXXXXX)")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  isPrimary: z.boolean().optional().default(false),
});

export type CreateVendorLocationInput = z.infer<typeof createVendorLocationSchema>;

export const updateVendorLocationSchema = createVendorLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateVendorLocationInput = z.infer<typeof updateVendorLocationSchema>;

export const inviteStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(staffRoleValues),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
