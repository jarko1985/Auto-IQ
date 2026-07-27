export interface EmailProvider {
  sendEmailVerification(to: string, token: string): Promise<void>;
  sendPasswordReset(to: string, token: string): Promise<void>;
  /** Signup flow (features/auth/service.ts's startSignup) — a 6-digit code, not a link.
   * Callers `await` this one and surface a failure to the user, unlike every other
   * method here, since the OTP email is the entire point of that request. */
  sendSignupOtp(to: string, code: string): Promise<void>;
  sendWelcome(to: string, name: string): Promise<void>;
  sendStaffInvitation(
    to: string,
    params: { organizationName: string; role: string; token: string },
  ): Promise<void>;
  sendVendorApplicationDecision(
    to: string,
    params: { organizationName: string; approved: boolean; reason?: string },
  ): Promise<void>;
  sendGarageApplicationDecision(
    to: string,
    params: { organizationName: string; approved: boolean; reason?: string },
  ): Promise<void>;
  sendBookingRequested(
    to: string,
    params: { garageName: string; bookingNumber: string; scheduledStart: string },
  ): Promise<void>;
  sendBookingStatusUpdate(
    to: string,
    params: { garageName: string; bookingNumber: string; status: string; note?: string },
  ): Promise<void>;
  /** Generic templated send for the notification abstraction (features/notifications/) —
   * every event without a dedicated typed method above renders its subject/body via
   * features/notifications/templates.ts and sends through this one method instead. */
  sendNotification(to: string, params: { subject: string; body: string }): Promise<void>;
}
