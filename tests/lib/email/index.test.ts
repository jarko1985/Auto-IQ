import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: vi.fn() })) },
}));

const envMock: { EMAIL_PROVIDER: "console" | "gmail" } = { EMAIL_PROVIDER: "console" };
vi.mock("@/lib/env", () => ({ env: envMock }));

async function freshGetEmailProvider() {
  vi.resetModules();
  const mod = await import("@/lib/email");
  return mod.getEmailProvider;
}

describe("getEmailProvider", () => {
  beforeEach(() => {
    envMock.EMAIL_PROVIDER = "console";
  });

  it("returns the console provider by default", async () => {
    const getEmailProvider = await freshGetEmailProvider();
    const provider = getEmailProvider();
    // The console provider logs instead of throwing on a missing Gmail config.
    await expect(provider.sendSignupOtp("a@b.com", "123456")).resolves.toBeUndefined();
  });

  it("returns the gmail provider when EMAIL_PROVIDER=gmail", async () => {
    envMock.EMAIL_PROVIDER = "gmail";
    const getEmailProvider = await freshGetEmailProvider();
    const provider = getEmailProvider();
    const { gmailEmailProvider } = await import("@/lib/email/gmail-provider");
    expect(provider).toBe(gmailEmailProvider);
  });
});
