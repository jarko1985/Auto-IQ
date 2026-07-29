import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getStorageProvider } from "@/lib/storage";
import type { ChangePasswordInput, UpdateProfileInput, UploadAvatarInput } from "./schemas";
import * as repo from "./repository";

const POINTS_PER_MINOR_UNITS = 10000; // matches checkout-view.tsx's estimatedPoints formula
const AVATAR_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function getMyAccount(userId: string) {
  const profile = await repo.findAccountProfile(userId);
  if (!profile) throw new NotFoundError("Account");

  const [linkedProviders, stats] = await Promise.all([
    repo.findLinkedProviders(userId),
    repo.getAccountStats(userId),
  ]);

  return {
    ...profile,
    linkedProviders,
    stats: {
      vehicleCount: stats.vehicleCount,
      completedBookingCount: stats.completedBookingCount,
      diagnosticSessionCount: stats.diagnosticSessionCount,
      autoIqPoints: Math.floor(stats.totalPaidMinorUnits / POINTS_PER_MINOR_UNITS),
    },
  };
}

export async function updateMyProfile(userId: string, data: UpdateProfileInput) {
  const updated = await repo.updateProfile(userId, { name: data.name, phone: data.phone ?? null });
  await repo.createAuditLog({
    userId,
    action: "AUTH_PROFILE_UPDATED",
    metadata: { field: "profile" },
  });
  return updated;
}

export async function changeMyPassword(userId: string, data: ChangePasswordInput) {
  const record = await repo.findPasswordHash(userId);
  if (!record?.passwordHash) {
    throw new ValidationError(
      "This account signs in with Google — there is no password to change.",
    );
  }

  const valid = await bcrypt.compare(data.currentPassword, record.passwordHash);
  if (!valid) throw new ValidationError("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await repo.updatePasswordHash(userId, passwordHash);
  await repo.createAuditLog({ userId, action: "AUTH_PASSWORD_CHANGED" });
}

export async function updateMyAvatar(
  userId: string,
  fileData: Buffer,
  meta: UploadAvatarInput,
) {
  const ext = AVATAR_EXT_BY_MIME[meta.mimeType] ?? "bin";
  const key = `avatars/${userId}/${randomUUID()}.${ext}`;

  const storage = getStorageProvider();
  const { url } = await storage.upload(key, fileData, meta.mimeType);

  const updated = await repo.updateAvatar(userId, url);
  await repo.createAuditLog({ userId, action: "AUTH_PROFILE_UPDATED", metadata: { field: "avatar" } });
  return updated;
}

export async function updateMyLocale(userId: string, locale: string) {
  const updated = await repo.updateLocale(userId, locale);
  await repo.createAuditLog({
    userId,
    action: "AUTH_PROFILE_UPDATED",
    metadata: { field: "locale", locale },
  });
  return updated;
}

export async function listMyRecentActivity(userId: string, limit = 5) {
  return repo.listRecentActivity(userId, limit);
}
