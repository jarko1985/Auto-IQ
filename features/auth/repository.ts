import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      passwordHash: true,
      status: true,
      role: true,
      emailVerified: true,
    },
  });
}

/** First org-scoped role found across a user's memberships (VENDOR_OWNER, GARAGE_MANAGER,
 * MECHANIC, ...). Sprint 1's data model assumes one effective role per session — a user
 * belonging to multiple orgs/roles just gets the first membership found. */
export async function findPrimaryMembershipRole(userId: string) {
  const membership = await db.organizationMembership.findFirst({
    where: { userId, roles: { some: {} } },
    orderBy: { createdAt: "asc" },
    select: { roles: { take: 1, select: { role: { select: { name: true } } } } },
  });
  return membership?.roles[0]?.role.name ?? null;
}

export async function findUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      status: true,
      emailVerified: true,
      phone: true,
      phoneVerified: true,
    },
  });
}

export async function createUser(data: { name: string; email: string; passwordHash: string }) {
  return db.user.create({
    data,
    select: { id: true, email: true, name: true, status: true },
  });
}

/** Used by completeSignup() — the OTP step already proved the user owns this email
 * address, so unlike createUser() there's no need to leave status at the Prisma
 * PENDING_VERIFICATION default waiting on a separate verification step. */
export async function createVerifiedUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return db.user.create({
    data: { ...data, status: "ACTIVE", emailVerified: new Date() },
    select: { id: true, email: true, name: true, status: true },
  });
}

/** Idempotent — safe to call on every Google sign-in. Activates a user created via
 * OAuth, whose email is verified by the provider but who otherwise gets stuck at
 * Prisma's PENDING_VERIFICATION default (nothing else ever flips OAuth users active).
 * Only stamps emailVerified the first time, so it keeps meaning "first verified at". */
export async function activateOAuthUser(userId: string) {
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { status: true, emailVerified: true },
  });
  if (current?.status === "ACTIVE" && current.emailVerified) return;

  return db.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", emailVerified: current?.emailVerified ?? new Date() },
  });
}

export async function findUserRoleAndStatus(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  return db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function markEmailVerified(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date(), status: "ACTIVE" },
  });
}

export async function findValidResetToken(token: string) {
  return db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, status: true } } },
  });
}

export async function createResetToken(userId: string, token: string, expiresAt: Date) {
  return db.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });
}

export async function consumeResetToken(id: string) {
  return db.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function createAuditLog(data: {
  userId?: string;
  action: import("@prisma/client").AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { userId, ...rest } = data;
  return db.auditLog.create({
    data: userId ? { ...rest, user: { connect: { id: userId } } } : rest,
  });
}

export async function createOtpToken(phone: string, token: string, expiresAt: Date) {
  await db.phoneOtpToken.updateMany({
    where: { phone, usedAt: null },
    data: { usedAt: new Date() },
  });
  return db.phoneOtpToken.create({ data: { phone, token, expiresAt } });
}

export async function findValidOtpToken(phone: string, token: string) {
  return db.phoneOtpToken.findFirst({
    where: {
      phone,
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
  });
}

export async function consumeOtpToken(id: string) {
  return db.phoneOtpToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function incrementOtpAttempts(id: string) {
  return db.phoneOtpToken.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
}

export async function createEmailOtpToken(email: string, codeHash: string, expiresAt: Date) {
  await db.emailOtpToken.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });
  return db.emailOtpToken.create({ data: { email, codeHash, expiresAt } });
}

export async function findLatestEmailOtpToken(email: string) {
  return db.emailOtpToken.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
}

export async function findValidEmailOtpToken(email: string, codeHash: string) {
  return db.emailOtpToken.findFirst({
    where: {
      email,
      codeHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
  });
}

/** The most recent not-yet-used, not-yet-expired token for this email — used to
 * increment attempts on a wrong-code guess even though the hash didn't match. */
export async function findActiveEmailOtpToken(email: string) {
  return db.emailOtpToken.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function consumeEmailOtpToken(id: string) {
  return db.emailOtpToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function incrementEmailOtpAttempts(id: string) {
  return db.emailOtpToken.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
}
