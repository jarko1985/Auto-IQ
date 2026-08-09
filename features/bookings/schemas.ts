import { z } from "zod";
import { serviceTypeValues, vehicleTypeValues } from "@/features/vehicles/schemas";
import { emirateValues } from "@/features/garages/schemas";

export { serviceTypeValues, vehicleTypeValues, emirateValues };

export const bookingStatusValues = [
  "REQUESTED",
  "ACCEPTED",
  "RESCHEDULE_PROPOSED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

// ── Garage search (public) ───────────────────────────────────────────────────

/** Comma-separated query param → array, e.g. "BRAKE_SERVICE,AC_SERVICE". */
const commaSeparatedEnumArray = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (val) => {
      if (typeof val !== "string" || val.length === 0) return undefined;
      return val.split(",").filter(Boolean);
    },
    z.array(z.enum(values)).optional(),
  );

export const searchGaragesSchema = z.object({
  query: z.string().max(200).optional(),
  emirate: z.enum(emirateValues).optional(),
  serviceTypes: commaSeparatedEnumArray(serviceTypeValues),
  vehicleType: z.enum(vehicleTypeValues).optional(),
  makeId: z.string().uuid().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(1000).optional(),
  sort: z.enum(["relevance", "distance", "rating"]).default("relevance"),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SearchGaragesInput = z.infer<typeof searchGaragesSchema>;

export const listSlotsSchema = z.object({
  locationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  // Optional — omitting it preserves the standard 60-minute duration every
  // existing caller already relies on. Passing it lets slot generation use a
  // service-specific duration (see getServiceDurationMinutes), e.g. OBD_SCAN's
  // shorter 15-minute slot.
  serviceType: z.enum(serviceTypeValues).optional(),
});
export type ListSlotsInput = z.infer<typeof listSlotsSchema>;

// ── Booking creation (customer) ──────────────────────────────────────────────

export const createBookingSchema = z.object({
  garageId: z.string().uuid(),
  locationId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  serviceType: z.enum(serviceTypeValues),
  scheduledStart: z.string().datetime({ message: "Must be an ISO 8601 datetime" }),
  customerNotes: z.string().max(1000).optional(),
  diagnosticSessionId: z.string().uuid().optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const listBookingsSchema = z.object({
  status: z.enum(bookingStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required").max(500),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ── Garage-side lifecycle actions ────────────────────────────────────────────

export const rejectBookingSchema = z.object({
  reason: z.string().min(1, "A rejection reason is required").max(500),
});
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;

export const proposeRescheduleSchema = z.object({
  proposedStart: z.string().datetime({ message: "Must be an ISO 8601 datetime" }),
  note: z.string().max(500).optional(),
});
export type ProposeRescheduleInput = z.infer<typeof proposeRescheduleSchema>;

export const respondToRescheduleSchema = z.object({
  accept: z.boolean(),
});
export type RespondToRescheduleInput = z.infer<typeof respondToRescheduleSchema>;
