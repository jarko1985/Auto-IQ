import type { NotificationCategory, NotificationEventType } from "@prisma/client";

export interface ChannelDefaults {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}

/** Category + default per-channel opt-in for every event, sourced from the
 * Stitch "Notification Preferences" mockup's own toggle states. */
export const EVENT_METADATA: Record<
  NotificationEventType,
  { category: NotificationCategory; defaults: ChannelDefaults; label: string; locked: boolean }
> = {
  EMAIL_VERIFICATION: {
    category: "ACCOUNT",
    defaults: { emailEnabled: true, smsEnabled: false, inAppEnabled: true },
    label: "Email verification",
    locked: true,
  },
  DIAGNOSTIC_COMPLETE: {
    category: "DIAGNOSTICS",
    defaults: { emailEnabled: true, smsEnabled: false, inAppEnabled: true },
    label: "Diagnostic complete",
    locked: false,
  },
  BOOKING_REQUESTED: {
    category: "BOOKINGS",
    defaults: { emailEnabled: true, smsEnabled: false, inAppEnabled: true },
    label: "Booking requested",
    locked: false,
  },
  BOOKING_ACCEPTED: {
    category: "BOOKINGS",
    defaults: { emailEnabled: false, smsEnabled: true, inAppEnabled: true },
    label: "Booking accepted or updated",
    locked: false,
  },
  ESTIMATE_READY: {
    category: "REPAIR_ORDERS",
    defaults: { emailEnabled: true, smsEnabled: true, inAppEnabled: true },
    label: "Estimate ready",
    locked: false,
  },
  ESTIMATE_APPROVED: {
    category: "REPAIR_ORDERS",
    defaults: { emailEnabled: false, smsEnabled: false, inAppEnabled: true },
    label: "Estimate approved",
    locked: false,
  },
  REPAIR_STATUS_CHANGED: {
    category: "REPAIR_ORDERS",
    defaults: { emailEnabled: false, smsEnabled: true, inAppEnabled: true },
    label: "Repair status changed",
    locked: false,
  },
  REPAIR_COMPLETED: {
    category: "REPAIR_ORDERS",
    defaults: { emailEnabled: true, smsEnabled: false, inAppEnabled: true },
    label: "Repair completed",
    locked: false,
  },
  PAYMENT_COMPLETE: {
    category: "PAYMENTS",
    defaults: { emailEnabled: true, smsEnabled: false, inAppEnabled: true },
    label: "Payment successful",
    locked: false,
  },
  PAYMENT_FAILED: {
    category: "PAYMENTS",
    defaults: { emailEnabled: true, smsEnabled: true, inAppEnabled: true },
    label: "Payment failed",
    locked: false,
  },
};
