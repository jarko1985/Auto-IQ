import { describe, it, expect } from "vitest";
import {
  requestSignupOtpSchema,
  verifySignupOtpSchema,
  completeSignupSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "@/features/auth/schemas";

describe("requestSignupOtpSchema", () => {
  it("accepts a valid email", () => {
    expect(requestSignupOtpSchema.safeParse({ email: "jane@example.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(requestSignupOtpSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("verifySignupOtpSchema", () => {
  it("accepts a valid 6-digit code", () => {
    expect(
      verifySignupOtpSchema.safeParse({ email: "jane@example.com", code: "123456" }).success,
    ).toBe(true);
  });

  it("rejects a code that is not 6 digits", () => {
    expect(
      verifySignupOtpSchema.safeParse({ email: "jane@example.com", code: "12345" }).success,
    ).toBe(false);
  });
});

describe("completeSignupSchema", () => {
  const valid = { ticket: "opaque-ticket", name: "Jane Smith", password: "SecurePass1" };

  it("accepts valid data", () => {
    expect(completeSignupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing ticket", () => {
    expect(completeSignupSchema.safeParse({ ...valid, ticket: "" }).success).toBe(false);
  });

  it("rejects short names", () => {
    expect(completeSignupSchema.safeParse({ ...valid, name: "J" }).success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(completeSignupSchema.safeParse({ ...valid, password: "securepass1" }).success).toBe(
      false,
    );
  });

  it("rejects password without number", () => {
    expect(completeSignupSchema.safeParse({ ...valid, password: "SecurePass" }).success).toBe(
      false,
    );
  });

  it("rejects password shorter than 8 chars", () => {
    expect(completeSignupSchema.safeParse({ ...valid, password: "Sec1" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "anything" }).success).toBe(true);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "pass" }).success).toBe(false);
  });
});

describe("requestOtpSchema", () => {
  it("accepts valid UAE phone numbers", () => {
    expect(requestOtpSchema.safeParse({ phone: "+971501234567" }).success).toBe(true);
    expect(requestOtpSchema.safeParse({ phone: "+97112345678" }).success).toBe(true);
  });

  it("rejects non-UAE phone numbers", () => {
    expect(requestOtpSchema.safeParse({ phone: "+447911123456" }).success).toBe(false);
    expect(requestOtpSchema.safeParse({ phone: "0501234567" }).success).toBe(false);
  });
});

describe("verifyOtpSchema", () => {
  it("accepts valid 6-digit OTP", () => {
    expect(verifyOtpSchema.safeParse({ phone: "+971501234567", token: "123456" }).success).toBe(
      true,
    );
  });

  it("rejects OTP that is not 6 digits", () => {
    expect(verifyOtpSchema.safeParse({ phone: "+971501234567", token: "12345" }).success).toBe(
      false,
    );
    expect(verifyOtpSchema.safeParse({ phone: "+971501234567", token: "1234567" }).success).toBe(
      false,
    );
  });
});
