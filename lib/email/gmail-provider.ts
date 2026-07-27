import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import type { EmailProvider } from "./types";

const appUrl = env.APP_URL;

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set to use EMAIL_PROVIDER=gmail. See docs/guides/gmail-setup.md.",
    );
  }
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  return transporter;
}

function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f7fafd; padding: 32px 16px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #ebeef1;">
        <div style="background-color: #081a2f; padding: 20px 24px;">
          <span style="color: #ffffff; font-size: 18px; font-weight: 700;">AutoIQ<span style="color: #00b8d9;">UAE</span></span>
        </div>
        <div style="padding: 28px 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #081a2f; margin: 0 0 16px;">${title}</h1>
          ${bodyHtml}
        </div>
        <div style="padding: 16px 24px; background-color: #f7fafd; border-top: 1px solid #ebeef1;">
          <p style="font-size: 12px; color: #74777d; margin: 0;">AutoIQ UAE &mdash; AI-powered vehicle diagnostics &amp; repair marketplace.</p>
        </div>
      </div>
    </div>
  `;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #00b8d9; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">${label}</a>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  await getTransporter().sendMail({
    from: env.EMAIL_FROM ?? env.GMAIL_USER,
    to,
    subject,
    html,
  });
}

export const gmailEmailProvider: EmailProvider = {
  async sendEmailVerification(to, token) {
    const url = `${appUrl}/en/verify-email?token=${token}`;
    await send(
      to,
      "Verify your AutoIQ email address",
      layout(
        "Verify your email",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0 0 20px;">Please confirm this is your email address.</p>${button(url, "Verify Email")}`,
      ),
    );
  },

  async sendPasswordReset(to, token) {
    const url = `${appUrl}/en/reset-password?token=${token}`;
    await send(
      to,
      "Reset your AutoIQ password",
      layout(
        "Reset your password",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0 0 20px;">We received a request to reset your password. This link expires in 60 minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>${button(url, "Reset Password")}`,
      ),
    );
  },

  async sendSignupOtp(to, code) {
    await send(
      to,
      `${code} is your AutoIQ verification code`,
      layout(
        "Verify your email",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0 0 20px;">Enter this code to finish creating your AutoIQ account. It expires in 10 minutes.</p>
         <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #081a2f; margin: 0 0 20px; text-align: center;">${code}</p>
         <p style="font-size: 12px; color: #74777d; margin: 0;">If you didn't request this, you can safely ignore this email.</p>`,
      ),
    );
  },

  async sendWelcome(to, name) {
    await send(
      to,
      "Welcome to AutoIQ UAE",
      layout(
        `Welcome, ${name}`,
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0;">Your account is ready. Sign in any time to run an AI diagnostic, book a garage, or shop spare parts.</p>`,
      ),
    );
  },

  async sendStaffInvitation(to, { organizationName, role, token }) {
    const url = `${appUrl}/en/invitations/${token}`;
    await send(
      to,
      `You've been invited to join ${organizationName} on AutoIQ`,
      layout(
        "You've been invited",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0 0 20px;"><strong>${organizationName}</strong> invited you to join as <strong>${role}</strong> on AutoIQ.</p>${button(url, "Accept Invitation")}`,
      ),
    );
  },

  async sendVendorApplicationDecision(to, { organizationName, approved, reason }) {
    await send(
      to,
      `Your vendor application for ${organizationName} was ${approved ? "approved" : "rejected"}`,
      layout(
        approved ? "Application approved" : "Application rejected",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0;">Your vendor application for <strong>${organizationName}</strong> was ${
          approved
            ? "approved. You can now sign in and manage your storefront."
            : `rejected.${reason ? ` Reason: ${reason}` : ""}`
        }</p>`,
      ),
    );
  },

  async sendGarageApplicationDecision(to, { organizationName, approved, reason }) {
    await send(
      to,
      `Your garage application for ${organizationName} was ${approved ? "approved" : "rejected"}`,
      layout(
        approved ? "Application approved" : "Application rejected",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0;">Your garage application for <strong>${organizationName}</strong> was ${
          approved
            ? "approved. You can now sign in and manage your garage."
            : `rejected.${reason ? ` Reason: ${reason}` : ""}`
        }</p>`,
      ),
    );
  },

  async sendBookingRequested(to, { garageName, bookingNumber, scheduledStart }) {
    await send(
      to,
      `Booking request received — ${bookingNumber}`,
      layout(
        "Booking requested",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0;">Your booking <strong>${bookingNumber}</strong> with <strong>${garageName}</strong> for ${scheduledStart} is awaiting confirmation.</p>`,
      ),
    );
  },

  async sendBookingStatusUpdate(to, { garageName, bookingNumber, status, note }) {
    await send(
      to,
      `Booking ${bookingNumber} update: ${status}`,
      layout(
        "Booking status update",
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0;">Your booking <strong>${bookingNumber}</strong> with <strong>${garageName}</strong> is now <strong>${status}</strong>.${note ? ` ${note}` : ""}</p>`,
      ),
    );
  },

  async sendNotification(to, { subject, body }) {
    await send(
      to,
      subject,
      layout(
        subject,
        `<p style="font-size: 14px; color: #44474d; line-height: 1.6; margin: 0;">${body}</p>`,
      ),
    );
  },
};
