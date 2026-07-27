import { z } from "zod";
import { serviceTypeValues, vehicleTypeValues } from "@/features/vehicles/schemas";

export const emirateValues = [
  "DUBAI",
  "ABU_DHABI",
  "SHARJAH",
  "AJMAN",
  "UMM_AL_QUWAIN",
  "RAS_AL_KHAIMAH",
  "FUJAIRAH",
] as const;

export const garageDocumentTypeValues = [
  "TRADE_LICENSE",
  "VAT_CERTIFICATE",
  "EMIRATES_ID_FRONT",
  "EMIRATES_ID_BACK",
  "PASSPORT",
  "OTHER",
] as const;

export const staffRoleValues = ["GARAGE_OWNER", "GARAGE_MANAGER", "MECHANIC"] as const;

export { serviceTypeValues, vehicleTypeValues };

const uaePhoneRegex = /^\+971[0-9]{8,9}$/;

export const createGarageProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(200),
  tradeLicenseNumber: z.string().min(1, "Trade license number is required").max(50),
  tradeLicenseExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  contactPersonName: z.string().min(1, "Contact person is required").max(200),
  contactPhone: z.string().regex(uaePhoneRegex, "Must be a valid UAE phone number (+971XXXXXXXXX)"),
  contactEmail: z.string().email("Invalid email address"),
  addressLine1: z.string().min(1, "Street address is required").max(300),
  emirate: z.enum(emirateValues),
});

export type CreateGarageProfileInput = z.infer<typeof createGarageProfileSchema>;

export const updateGarageProfileSchema = createGarageProfileSchema.partial().extend({
  authorizedSignatoryName: z.string().min(1).max(200).optional(),
  authorizedSignatoryEmiratesId: z
    .string()
    .regex(/^\d{3}-\d{4}-\d{7}-\d$/, "Emirates ID must be in the format 784-YYYY-XXXXXXX-X")
    .optional(),
});

export type UpdateGarageProfileInput = z.infer<typeof updateGarageProfileSchema>;

export const uploadGarageDocumentSchema = z.object({
  type: z.enum(garageDocumentTypeValues),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024), // 10 MB max
});

export type UploadGarageDocumentInput = z.infer<typeof uploadGarageDocumentSchema>;

export const rejectGarageSchema = z.object({
  reason: z.string().min(1, "A rejection reason is required").max(1000),
});

export type RejectGarageInput = z.infer<typeof rejectGarageSchema>;

export const listGarageQueueSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListGarageQueueInput = z.infer<typeof listGarageQueueSchema>;

export const createGarageLocationSchema = z.object({
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

export type CreateGarageLocationInput = z.infer<typeof createGarageLocationSchema>;

export const updateGarageLocationSchema = createGarageLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateGarageLocationInput = z.infer<typeof updateGarageLocationSchema>;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const workingHourEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z.string().regex(timeRegex, "Must be HH:mm").optional().nullable(),
    closeTime: z.string().regex(timeRegex, "Must be HH:mm").optional().nullable(),
  })
  .refine((v) => v.isClosed || (v.openTime && v.closeTime), {
    message: "Open and close time are required unless the day is marked closed",
  });

export const updateWorkingHoursSchema = z.object({
  hours: z.array(workingHourEntrySchema).min(7).max(7),
});

export type UpdateWorkingHoursInput = z.infer<typeof updateWorkingHoursSchema>;

export const updateServicesSchema = z.object({
  serviceTypes: z.array(z.enum(serviceTypeValues)),
});

export type UpdateServicesInput = z.infer<typeof updateServicesSchema>;

export const updateVehicleCapabilitiesSchema = z.object({
  vehicleTypes: z.array(z.enum(vehicleTypeValues)),
});

export type UpdateVehicleCapabilitiesInput = z.infer<typeof updateVehicleCapabilitiesSchema>;

export const updateMakeSpecializationsSchema = z.object({
  makeIds: z.array(z.string().uuid()),
});

export type UpdateMakeSpecializationsInput = z.infer<typeof updateMakeSpecializationsSchema>;

export const inviteStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(staffRoleValues),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateMechanicProfileSchema = z.object({
  specialties: z.array(z.enum(serviceTypeValues)).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
});

export type UpdateMechanicProfileInput = z.infer<typeof updateMechanicProfileSchema>;
