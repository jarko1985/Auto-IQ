import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { RoleName, UserStatus } from "@prisma/client";
import type { CompleteSignupInput, LoginInput } from "./schemas";
import * as repo from "./repository";
import { generateOtpCode, hashOtpCode } from "./otp";
import { signSignupTicket, verifySignupTicket } from "./tickets";
import { getEmailProvider } from "@/lib/email";
import { AppError, UnauthorizedError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";

const RESET_TOKEN_TTL_MINUTES = 60;
const OTP_TTL_MINUTES = 10;
const SIGNUP_OTP_TTL_MINUTES = 10;
const SIGNUP_OTP_RESEND_COOLDOWN_SECONDS = 60;

export async function startSignup(email: string, ipAddress?: string) {
  const existing = await repo.findUserByEmail(email);
  if (existing) throw new ConflictError("An account with this email already exists.");

  const latest = await repo.findLatestEmailOtpToken(email);
  if (latest) {
    const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsedSeconds < SIGNUP_OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.ceil(SIGNUP_OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      throw new AppError("Please wait before requesting another code.", "OTP_COOLDOWN", 429, {
        retryAfterSeconds,
      });
    }
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + SIGNUP_OTP_TTL_MINUTES * 60 * 1000);
  await repo.createEmailOtpToken(email, hashOtpCode(code), expiresAt);

  try {
    await getEmailProvider().sendSignupOtp(email, code);
  } catch (err) {
    logger.error({ err, email }, "Failed to send signup OTP email");
    throw new AppError(
      "Unable to send verification email. Please try again shortly.",
      "EMAIL_SEND_FAILED",
      502,
    );
  }

  await repo.createAuditLog({
    action: "AUTH_SIGNUP_OTP_REQUESTED",
    metadata: { email } as Record<string, string>,
    ipAddress,
  });
}

export async function verifySignupOtp(email: string, code: string) {
  const record = await repo.findValidEmailOtpToken(email, hashOtpCode(code));

  if (!record) {
    const pending = await repo.findActiveEmailOtpToken(email);
    if (pending) await repo.incrementEmailOtpAttempts(pending.id);
    throw new AppError("Invalid or expired code.", "INVALID_OTP", 400);
  }

  await repo.consumeEmailOtpToken(record.id);
  await repo.createAuditLog({
    action: "AUTH_EMAIL_VERIFIED",
    metadata: { email } as Record<string, string>,
  });

  return { ticket: await signSignupTicket(email) };
}

export async function completeSignup(input: CompleteSignupInput, ipAddress?: string) {
  const decoded = await verifySignupTicket(input.ticket);
  if (!decoded) {
    throw new AppError(
      "This session has expired. Please start sign up again.",
      "INVALID_TICKET",
      400,
    );
  }

  const existing = await repo.findUserByEmail(decoded.email);
  if (existing) throw new ConflictError("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await repo.createVerifiedUser({
    name: input.name,
    email: decoded.email,
    passwordHash,
  });

  await repo.createAuditLog({ userId: user.id, action: "AUTH_REGISTER", ipAddress });

  return { id: user.id, email: user.email, name: user.name };
}

/** Idempotent — safe to call on every Google sign-in (see repo.activateOAuthUser). */
export async function activateOAuthUser(userId: string) {
  await repo.activateOAuthUser(userId);
}

/** Used by auth.ts's jwt callback to keep a live session's role/status fresh without
 * requiring a full re-login — see features/auth/session-refresh.ts. */
export async function refreshSessionRole(
  userId: string,
): Promise<{ role: RoleName; status: UserStatus } | null> {
  const user = await repo.findUserRoleAndStatus(userId);
  if (!user) return null;
  const role = await resolveSessionRole(userId, user.role);
  return { role, status: user.status };
}

export async function verifyCredentials(input: LoginInput, ipAddress?: string) {
  const user = await repo.findUserByEmail(input.email);

  if (!user || !user.passwordHash) {
    await repo.createAuditLog({
      action: "AUTH_LOGIN_FAILED",
      metadata: { email: input.email } as Record<string, string>,
      ipAddress,
    });
    throw new UnauthorizedError("Invalid email or password.");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    await repo.createAuditLog({ userId: user.id, action: "AUTH_LOGIN_FAILED", ipAddress });
    throw new UnauthorizedError("Invalid email or password.");
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(
      "Your account has been suspended. Contact support.",
      "ACCOUNT_SUSPENDED",
      403,
    );
  }

  const role = await resolveSessionRole(user.id, user.role);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    status: user.status,
    role,
  };
}

/**
 * A platform-level role set directly on the user (ADMIN, SUPER_ADMIN, SUPPORT_AGENT,
 * CONTENT_MANAGER) always wins. Otherwise, fall back to the first org-scoped role from
 * OrganizationMembership (VENDOR_OWNER, GARAGE_MANAGER, MECHANIC, ...), defaulting to
 * the user's own CUSTOMER role when they belong to no organization.
 */
async function resolveSessionRole(userId: string, directRole: RoleName): Promise<RoleName> {
  if (directRole !== "CUSTOMER") return directRole;
  const membershipRole = await repo.findPrimaryMembershipRole(userId);
  return membershipRole ?? "CUSTOMER";
}

export async function requestPasswordReset(email: string, ipAddress?: string) {
  const user = await repo.findUserByEmail(email);

  // Always return success to prevent user enumeration
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await repo.createResetToken(user.id, token, expiresAt);
  await repo.createAuditLog({
    userId: user.id,
    action: "AUTH_PASSWORD_RESET_REQUESTED",
    ipAddress,
  });

  getEmailProvider()
    .sendPasswordReset(user.email, token)
    .catch((err: unknown) => logger.error({ err }, "Failed to send reset email"));
}

export async function resetPassword(token: string, newPassword: string, ipAddress?: string) {
  const record = await repo.findValidResetToken(token);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("This reset link is invalid or has expired.", "INVALID_TOKEN", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await repo.updateUserPassword(record.userId, passwordHash);
  await repo.consumeResetToken(record.id);
  await repo.createAuditLog({
    userId: record.userId,
    action: "AUTH_PASSWORD_RESET_COMPLETED",
    ipAddress,
  });
}

export async function generateOtp(phone: string): Promise<void> {
  const token = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await repo.createOtpToken(phone, token, expiresAt);

  // In dev, log OTP; in prod the SMS provider delivers it
  logger.info(
    { phone, otp: process.env.NODE_ENV !== "production" ? token : "[hidden]" },
    "OTP generated",
  );
}

export async function verifyOtp(phone: string, token: string): Promise<void> {
  const record = await repo.findValidOtpToken(phone, token);

  if (!record) {
    const pending = await repo.findValidOtpToken(phone, "dummy-to-increment");
    if (pending) await repo.incrementOtpAttempts(pending.id);
    throw new AppError("Invalid or expired OTP.", "INVALID_OTP", 400);
  }

  await repo.consumeOtpToken(record.id);
  const user = await repo.findUserByEmail(phone);
  if (user) {
    await repo.createAuditLog({ userId: user.id, action: "AUTH_PHONE_VERIFIED" });
  }
}
