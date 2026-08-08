import { z } from "zod";

export const listNotificationsSchema = z.object({
  category: z.enum(["ACCOUNT", "DIAGNOSTICS", "BOOKINGS", "REPAIR_ORDERS", "PAYMENTS"]).optional(),
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

const preferenceEntrySchema = z.object({
  eventType: z.enum([
    "DIAGNOSTIC_COMPLETE",
    "BOOKING_REQUESTED",
    "BOOKING_ACCEPTED",
    "ESTIMATE_READY",
    "ESTIMATE_APPROVED",
    "PAYMENT_COMPLETE",
    "PAYMENT_FAILED",
    "REPAIR_STATUS_CHANGED",
    "REPAIR_COMPLETED",
  ]),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
});

export const updatePreferencesSchema = z.object({
  preferences: z.array(preferenceEntrySchema).min(1).max(9),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
