/**
 * @vitest-environment node
 *
 * jose's SignJWT does an `instanceof Uint8Array` check that fails under jsdom
 * (this repo's default test environment) — jsdom's TextEncoder produces a
 * Uint8Array from a different realm. Ticket signing needs no DOM at all, so
 * this file runs in the plain node environment instead.
 */
import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode } from "@/features/auth/otp";
import { signSignupTicket, verifySignupTicket } from "@/features/auth/tickets";

describe("generateOtpCode", () => {
  it("always returns a 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("is deterministic for the same input", () => {
    expect(hashOtpCode("123456")).toBe(hashOtpCode("123456"));
  });

  it("produces different hashes for different codes", () => {
    expect(hashOtpCode("123456")).not.toBe(hashOtpCode("654321"));
  });

  it("never returns the plaintext code", () => {
    expect(hashOtpCode("123456")).not.toBe("123456");
  });
});

describe("signup tickets", () => {
  it("round-trips a valid ticket", async () => {
    const ticket = await signSignupTicket("jane@example.com");
    const decoded = await verifySignupTicket(ticket);
    expect(decoded).toEqual({ email: "jane@example.com" });
  });

  it("rejects a tampered ticket", async () => {
    const ticket = await signSignupTicket("jane@example.com");
    const decoded = await verifySignupTicket(`${ticket}tampered`);
    expect(decoded).toBeNull();
  });

  it("rejects a garbage string", async () => {
    const decoded = await verifySignupTicket("not-a-real-ticket");
    expect(decoded).toBeNull();
  });
});
