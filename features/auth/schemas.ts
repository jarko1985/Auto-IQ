import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const requestSignupOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifySignupOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const completeSignupSchema = z.object({
  ticket: z.string().min(1, "Session expired — please start sign up again"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  password: passwordRule,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+971[0-9]{8,9}$/, "Must be a valid UAE phone number (+971XXXXXXXXX)"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1),
  token: z.string().length(6, "OTP must be 6 digits"),
});

export type RequestSignupOtpInput = z.infer<typeof requestSignupOtpSchema>;
export type VerifySignupOtpInput = z.infer<typeof verifySignupOtpSchema>;
export type CompleteSignupInput = z.infer<typeof completeSignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
