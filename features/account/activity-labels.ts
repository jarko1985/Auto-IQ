import type { AuditAction } from "@prisma/client";

/** Friendly labels for the subset of AuditAction values a user is likely to
 * see in their own "Recent Activity" feed. Anything not listed here falls
 * back to a generic Title Case humanization of the enum name. */
const ACTIVITY_LABELS: Partial<Record<AuditAction, string>> = {
  AUTH_REGISTER: "Account created",
  AUTH_LOGIN: "Signed in",
  AUTH_LOGOUT: "Signed out",
  AUTH_PASSWORD_CHANGED: "Password changed",
  AUTH_PASSWORD_RESET_COMPLETED: "Password reset",
  AUTH_PROFILE_UPDATED: "Profile updated",
  AUTH_PHONE_VERIFIED: "Phone number verified",
  DIAG_SESSION_STARTED: "Started a diagnostic session",
  DIAG_SESSION_COMPLETED: "Diagnostic session completed",
  BOOKING_REQUESTED: "Requested a booking",
  BOOKING_ACCEPTED: "Booking accepted",
  BOOKING_CANCELLED: "Booking cancelled",
  REPAIR_ORDER_CREATED: "Repair order created",
  REPAIR_ORDER_APPROVED: "Repair estimate approved",
  REPAIR_ORDER_COMPLETED: "Repair completed",
  VENDOR_ORDER_PLACED: "Parts order placed",
  INVOICE_ISSUED: "Invoice issued",
  PAYMENT_TRANSACTION_RECORDED: "Payment recorded",
  GARAGE_REVIEW_CREATED: "Left a garage review",
};

export function humanizeAuditAction(action: AuditAction): string {
  return (
    ACTIVITY_LABELS[action] ??
    action
      .toLowerCase()
      .split("_")
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(" ")
  );
}
