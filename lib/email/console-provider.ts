import { logger } from "@/lib/observability/logger";
import type { EmailProvider } from "./types";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const consoleEmailProvider: EmailProvider = {
  async sendEmailVerification(to, token) {
    const url = `${appUrl}/en/verify-email?token=${token}`;
    logger.info({ to, url }, "[EMAIL] Verify email");
  },

  async sendPasswordReset(to, token) {
    const url = `${appUrl}/en/reset-password?token=${token}`;
    logger.info({ to, url }, "[EMAIL] Password reset");
  },

  async sendSignupOtp(to, code) {
    logger.info({ to, code }, "[EMAIL] Signup verification code");
  },

  async sendWelcome(to, name) {
    logger.info({ to, name }, "[EMAIL] Welcome");
  },

  async sendStaffInvitation(to, { organizationName, role, token }) {
    const url = `${appUrl}/en/invitations/${token}`;
    logger.info({ to, organizationName, role, url }, "[EMAIL] Staff invitation");
  },

  async sendVendorApplicationDecision(to, { organizationName, approved, reason }) {
    logger.info(
      { to, organizationName, approved, reason },
      `[EMAIL] Vendor application ${approved ? "approved" : "rejected"}`,
    );
  },

  async sendGarageApplicationDecision(to, { organizationName, approved, reason }) {
    logger.info(
      { to, organizationName, approved, reason },
      `[EMAIL] Garage application ${approved ? "approved" : "rejected"}`,
    );
  },

  async sendBookingRequested(to, { garageName, bookingNumber, scheduledStart }) {
    logger.info(
      { to, garageName, bookingNumber, scheduledStart },
      "[EMAIL] Booking requested — awaiting garage response",
    );
  },

  async sendBookingStatusUpdate(to, { garageName, bookingNumber, status, note }) {
    logger.info({ to, garageName, bookingNumber, status, note }, "[EMAIL] Booking status update");
  },

  async sendNotification(to, { subject, body }) {
    logger.info({ to, subject, body }, "[EMAIL] Notification");
  },
};
