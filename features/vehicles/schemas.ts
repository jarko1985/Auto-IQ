import { z } from "zod";

const CURRENT_YEAR = new Date().getFullYear();

// UAE plate: flexible 1-15 chars, alphanumeric + spaces + dashes
const uaePlateRegex = /^[A-Z0-9\s\-]{1,15}$/i;
// Standard 17-char VIN, no I/O/Q
const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;

export const vehicleTypeValues = [
  "SEDAN",
  "SUV",
  "HATCHBACK",
  "COUPE",
  "PICKUP_TRUCK",
  "VAN",
  "MINIBUS",
  "TRUCK",
  "OTHER",
] as const;

export const fuelTypeValues = [
  "PETROL",
  "DIESEL",
  "HYBRID",
  "ELECTRIC",
  "PLUG_IN_HYBRID",
  "LPG",
] as const;

export const transmissionValues = ["AUTOMATIC", "MANUAL", "CVT", "DCT", "SEMI_AUTOMATIC"] as const;

export const documentTypeValues = [
  "REGISTRATION",
  "INSURANCE",
  "INSPECTION",
  "MODIFICATION",
  "OTHER",
] as const;

export const serviceTypeValues = [
  "OIL_CHANGE",
  "TYRE_ROTATION",
  "BRAKE_SERVICE",
  "FILTER_CHANGE",
  "FLUID_CHECK",
  "BATTERY_REPLACEMENT",
  "TIMING_BELT",
  "AC_SERVICE",
  "TRANSMISSION_SERVICE",
  "GENERAL_INSPECTION",
  "OTHER",
  // Sprint 21 — repair-category values added 1:1 with the diagnosis
  // service-code taxonomy (see prisma/schema.prisma's ServiceType enum).
  "ENGINE_REPAIR",
  "ELECTRICAL_REPAIR",
  "SUSPENSION_REPAIR",
  "COOLING_SYSTEM_REPAIR",
  "EXHAUST_REPAIR",
  "TYRE_REPAIR",
  "BODY_REPAIR",
  "STEERING_REPAIR",
  "FUEL_SYSTEM_REPAIR",
] as const;

export const createVehicleSchema = z.object({
  engineVariantId: z.string().uuid().optional(),
  makeName: z.string().min(1, "Make is required").max(100),
  modelName: z.string().min(1, "Model is required").max(100),
  trimName: z.string().max(100).optional(),
  year: z
    .number({ invalid_type_error: "Year must be a number" })
    .int()
    .min(1990, "Year must be 1990 or later")
    .max(CURRENT_YEAR + 1, `Year cannot be later than ${CURRENT_YEAR + 1}`),
  vehicleType: z.enum(vehicleTypeValues),
  fuelType: z.enum(fuelTypeValues),
  transmission: z.enum(transmissionValues),
  color: z.string().max(50).optional(),
  plateNumber: z
    .string()
    .regex(uaePlateRegex, "Invalid plate number format")
    .optional()
    .or(z.literal("")),
  vin: z
    .string()
    .regex(vinRegex, "VIN must be 17 alphanumeric characters (no I, O, or Q)")
    .optional()
    .or(z.literal("")),
  mileageKm: z
    .number({ invalid_type_error: "Mileage must be a number" })
    .int()
    .min(0, "Mileage cannot be negative")
    .max(9_999_999),
  notes: z.string().max(1000).optional(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema
  .omit({ vin: true })
  .partial()
  .extend({
    vin: z
      .string()
      .regex(vinRegex, "VIN must be 17 alphanumeric characters (no I, O, or Q)")
      .optional()
      .or(z.literal("")),
  });

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const createServiceHistorySchema = z.object({
  serviceType: z.enum(serviceTypeValues),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mileageKm: z.number().int().min(0),
  description: z.string().min(1).max(500),
  costMinorUnits: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateServiceHistoryInput = z.infer<typeof createServiceHistorySchema>;

export const uploadDocumentSchema = z.object({
  type: z.enum(documentTypeValues),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(20 * 1024 * 1024), // 20 MB max
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
