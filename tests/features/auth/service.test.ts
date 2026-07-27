/**
 * @vitest-environment node
 *
 * completeSignup()/verifySignupOtp() sign/verify JWTs via jose, which does an
 * `instanceof Uint8Array` check that fails under jsdom (this repo's default
 * test environment) — see tests/features/auth/otp.test.ts for detail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn().mockResolvedValue(true), hash: vi.fn().mockResolvedValue("hashed") },
}));

vi.mock("@/features/auth/repository", () => ({
  findUserByEmail: vi.fn(),
  findPrimaryMembershipRole: vi.fn(),
  createAuditLog: vi.fn(),
  findLatestEmailOtpToken: vi.fn(),
  createEmailOtpToken: vi.fn(),
  findValidEmailOtpToken: vi.fn(),
  findActiveEmailOtpToken: vi.fn(),
  incrementEmailOtpAttempts: vi.fn(),
  consumeEmailOtpToken: vi.fn(),
  createVerifiedUser: vi.fn(),
  activateOAuthUser: vi.fn(),
  findUserRoleAndStatus: vi.fn(),
}));

const sendSignupOtp = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({ sendSignupOtp, sendPasswordReset: vi.fn() }),
}));

import * as repo from "@/features/auth/repository";
import {
  verifyCredentials,
  startSignup,
  verifySignupOtp,
  completeSignup,
  activateOAuthUser,
} from "@/features/auth/service";
import { hashOtpCode } from "@/features/auth/otp";
import { signSignupTicket } from "@/features/auth/tickets";

const baseUser = {
  id: "user-1",
  email: "test@autoiq.dev",
  name: "Test User",
  image: null,
  passwordHash: "hashed",
  status: "ACTIVE" as const,
  emailVerified: new Date(),
};

describe("verifyCredentials — session role resolution", () => {
  beforeEach(() => {
    vi.mocked(repo.findUserByEmail).mockReset();
    vi.mocked(repo.findPrimaryMembershipRole).mockReset();
    vi.mocked(repo.createAuditLog).mockReset();
  });

  it("uses a direct platform role (e.g. SUPER_ADMIN) without consulting memberships", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...baseUser, role: "SUPER_ADMIN" });

    const result = await verifyCredentials({ email: baseUser.email, password: "DevPass123!" });

    expect(result.role).toBe("SUPER_ADMIN");
    expect(repo.findPrimaryMembershipRole).not.toHaveBeenCalled();
  });

  it("uses a direct ADMIN role", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...baseUser, role: "ADMIN" });

    const result = await verifyCredentials({ email: baseUser.email, password: "DevPass123!" });

    expect(result.role).toBe("ADMIN");
  });

  it("falls back to the user's primary org membership role when the direct role is CUSTOMER", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...baseUser, role: "CUSTOMER" });
    vi.mocked(repo.findPrimaryMembershipRole).mockResolvedValue("GARAGE_OWNER");

    const result = await verifyCredentials({ email: baseUser.email, password: "DevPass123!" });

    expect(result.role).toBe("GARAGE_OWNER");
    expect(repo.findPrimaryMembershipRole).toHaveBeenCalledWith("user-1");
  });

  it("defaults to CUSTOMER when there is no direct role and no org membership", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...baseUser, role: "CUSTOMER" });
    vi.mocked(repo.findPrimaryMembershipRole).mockResolvedValue(null);

    const result = await verifyCredentials({ email: baseUser.email, password: "DevPass123!" });

    expect(result.role).toBe("CUSTOMER");
  });
});

describe("startSignup", () => {
  beforeEach(() => {
    vi.mocked(repo.findUserByEmail).mockReset().mockResolvedValue(null);
    vi.mocked(repo.findLatestEmailOtpToken).mockReset().mockResolvedValue(null);
    vi.mocked(repo.createEmailOtpToken).mockReset();
    vi.mocked(repo.createAuditLog).mockReset();
    sendSignupOtp.mockClear().mockResolvedValue(undefined);
  });

  it("creates an OTP token and sends the email on the happy path", async () => {
    await startSignup("new@autoiq.dev");

    expect(repo.createEmailOtpToken).toHaveBeenCalledWith(
      "new@autoiq.dev",
      expect.any(String),
      expect.any(Date),
    );
    expect(sendSignupOtp).toHaveBeenCalledWith("new@autoiq.dev", expect.stringMatching(/^\d{6}$/));
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTH_SIGNUP_OTP_REQUESTED" }),
    );
  });

  it("rejects an email that is already registered", async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...baseUser, role: "CUSTOMER" });

    await expect(startSignup("taken@autoiq.dev")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repo.createEmailOtpToken).not.toHaveBeenCalled();
  });

  it("enforces the resend cooldown", async () => {
    vi.mocked(repo.findLatestEmailOtpToken).mockResolvedValue({
      id: "otp-1",
      email: "new@autoiq.dev",
      codeHash: "x",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      attempts: 0,
      createdAt: new Date(),
    });

    await expect(startSignup("new@autoiq.dev")).rejects.toMatchObject({
      code: "OTP_COOLDOWN",
      statusCode: 429,
    });
    expect(repo.createEmailOtpToken).not.toHaveBeenCalled();
  });

  it("surfaces an email-send failure instead of leaving the user waiting silently", async () => {
    sendSignupOtp.mockRejectedValue(new Error("smtp down"));

    await expect(startSignup("new@autoiq.dev")).rejects.toMatchObject({
      code: "EMAIL_SEND_FAILED",
      statusCode: 502,
    });
  });
});

describe("verifySignupOtp", () => {
  beforeEach(() => {
    vi.mocked(repo.findValidEmailOtpToken).mockReset();
    vi.mocked(repo.findActiveEmailOtpToken).mockReset();
    vi.mocked(repo.incrementEmailOtpAttempts).mockReset();
    vi.mocked(repo.consumeEmailOtpToken).mockReset();
    vi.mocked(repo.createAuditLog).mockReset();
  });

  it("issues a ticket for a correct code", async () => {
    vi.mocked(repo.findValidEmailOtpToken).mockResolvedValue({
      id: "otp-1",
      email: "new@autoiq.dev",
      codeHash: hashOtpCode("123456"),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      attempts: 0,
      createdAt: new Date(),
    });

    const result = await verifySignupOtp("new@autoiq.dev", "123456");

    expect(result.ticket).toEqual(expect.any(String));
    expect(repo.consumeEmailOtpToken).toHaveBeenCalledWith("otp-1");
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTH_EMAIL_VERIFIED" }),
    );
  });

  it("increments attempts and rejects a wrong code", async () => {
    vi.mocked(repo.findValidEmailOtpToken).mockResolvedValue(null);
    vi.mocked(repo.findActiveEmailOtpToken).mockResolvedValue({
      id: "otp-1",
      email: "new@autoiq.dev",
      codeHash: hashOtpCode("123456"),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      attempts: 1,
      createdAt: new Date(),
    });

    await expect(verifySignupOtp("new@autoiq.dev", "999999")).rejects.toMatchObject({
      code: "INVALID_OTP",
    });
    expect(repo.incrementEmailOtpAttempts).toHaveBeenCalledWith("otp-1");
  });

  it("rejects when there is no active token at all (expired/used)", async () => {
    vi.mocked(repo.findValidEmailOtpToken).mockResolvedValue(null);
    vi.mocked(repo.findActiveEmailOtpToken).mockResolvedValue(null);

    await expect(verifySignupOtp("new@autoiq.dev", "123456")).rejects.toMatchObject({
      code: "INVALID_OTP",
    });
    expect(repo.incrementEmailOtpAttempts).not.toHaveBeenCalled();
  });
});

describe("completeSignup", () => {
  beforeEach(() => {
    vi.mocked(repo.findUserByEmail).mockReset().mockResolvedValue(null);
    vi.mocked(repo.createVerifiedUser).mockReset().mockResolvedValue({
      id: "user-2",
      email: "new@autoiq.dev",
      name: "Jane Smith",
      status: "ACTIVE",
    });
    vi.mocked(repo.createAuditLog).mockReset();
  });

  it("creates an ACTIVE, verified user from a valid ticket", async () => {
    const ticket = await signSignupTicket("new@autoiq.dev");

    const result = await completeSignup({ ticket, name: "Jane Smith", password: "SecurePass1" });

    expect(result).toEqual({ id: "user-2", email: "new@autoiq.dev", name: "Jane Smith" });
    expect(repo.createVerifiedUser).toHaveBeenCalledWith({
      name: "Jane Smith",
      email: "new@autoiq.dev",
      passwordHash: "hashed",
    });
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "AUTH_REGISTER" }),
    );
  });

  it("rejects an invalid or expired ticket", async () => {
    await expect(
      completeSignup({ ticket: "garbage", name: "Jane Smith", password: "SecurePass1" }),
    ).rejects.toMatchObject({ code: "INVALID_TICKET" });
    expect(repo.createVerifiedUser).not.toHaveBeenCalled();
  });

  it("rejects when the email became registered between OTP-verify and complete (race guard)", async () => {
    const ticket = await signSignupTicket("new@autoiq.dev");
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...baseUser, role: "CUSTOMER" });

    await expect(
      completeSignup({ ticket, name: "Jane Smith", password: "SecurePass1" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repo.createVerifiedUser).not.toHaveBeenCalled();
  });
});

describe("activateOAuthUser", () => {
  it("delegates to the repository", async () => {
    vi.mocked(repo.activateOAuthUser).mockReset().mockResolvedValue(undefined);

    await activateOAuthUser("user-1");

    expect(repo.activateOAuthUser).toHaveBeenCalledWith("user-1");
  });
});
