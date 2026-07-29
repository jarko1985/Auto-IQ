import { z } from "zod";
import { passwordRule } from "@/features/auth/schemas";
import { routing } from "@/i18n/routing";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^\+971[0-9]{8,9}$/, "Must be a valid UAE phone number (+971XXXXXXXXX)")
    .nullable()
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateLocaleSchema = z.object({
  locale: z.enum(routing.locales),
});

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const uploadAvatarSchema = z.object({
  mimeType: z.enum(AVATAR_ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(AVATAR_MAX_SIZE_BYTES, "Image must be 5MB or smaller"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>;
