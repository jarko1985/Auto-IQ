import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EmailProvider } from "@/lib/email/types";

const sendMail = vi.fn().mockResolvedValue({ messageId: "abc" });
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
    GMAIL_USER: "sender@gmail.com",
    GMAIL_APP_PASSWORD: "app-password",
    EMAIL_FROM: undefined,
  },
}));

// The provider caches a single transporter at module scope — reset modules
// and re-import fresh each test so that singleton doesn't leak across tests.
async function freshProvider(): Promise<EmailProvider> {
  vi.resetModules();
  const mod = await import("@/lib/email/gmail-provider");
  return mod.gmailEmailProvider;
}

describe("gmailEmailProvider", () => {
  beforeEach(() => {
    sendMail.mockClear().mockResolvedValue({ messageId: "abc" });
    createTransport.mockClear();
  });

  it("sends the signup OTP code with the code visible in the body", async () => {
    const provider = await freshProvider();
    await provider.sendSignupOtp("customer@autoiq.dev", "123456");

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0]![0]!;
    expect(call.to).toBe("customer@autoiq.dev");
    expect(call.from).toBe("sender@gmail.com");
    expect(call.subject).toContain("123456");
    expect(call.html).toContain("123456");
  });

  it("sends a password reset link containing the token", async () => {
    const provider = await freshProvider();
    await provider.sendPasswordReset("customer@autoiq.dev", "reset-token");

    const call = sendMail.mock.calls[0]![0]!;
    expect(call.html).toContain("reset-token");
    expect(call.html).toContain("/reset-password?token=reset-token");
  });

  it("propagates a send failure instead of swallowing it", async () => {
    const provider = await freshProvider();
    sendMail.mockRejectedValue(new Error("smtp rejected"));

    await expect(provider.sendSignupOtp("customer@autoiq.dev", "123456")).rejects.toThrow(
      "smtp rejected",
    );
  });

  it("reuses a single transporter across calls", async () => {
    const provider = await freshProvider();
    await provider.sendWelcome("a@b.com", "A");
    await provider.sendWelcome("a@b.com", "A");

    expect(createTransport).toHaveBeenCalledTimes(1);
  });
});
