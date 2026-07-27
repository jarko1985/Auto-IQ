import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => {
  class FakeStripeError extends Error {
    type = "StripeError";
    code?: string;
    constructor(message: string) {
      super(message);
      this.name = "StripeError";
    }
  }
  class FakeStripeConnectionError extends FakeStripeError {}
  class FakeStripeSignatureVerificationError extends FakeStripeError {}

  return {
    FakeStripeError,
    FakeStripeConnectionError,
    FakeStripeSignatureVerificationError,
    createMock: vi.fn(),
    captureMock: vi.fn(),
    cancelMock: vi.fn(),
    refundCreateMock: vi.fn(),
    constructEventMock: vi.fn(),
  };
});

vi.mock("stripe", () => {
  class FakeStripe {
    paymentIntents = {
      create: hoisted.createMock,
      capture: hoisted.captureMock,
      cancel: hoisted.cancelMock,
    };
    refunds = { create: hoisted.refundCreateMock };
    webhooks = { constructEvent: hoisted.constructEventMock };
  }
  (FakeStripe as unknown as { errors: unknown }).errors = {
    StripeError: hoisted.FakeStripeError,
    StripeConnectionError: hoisted.FakeStripeConnectionError,
    StripeAPIError: class extends hoisted.FakeStripeError {},
    StripeRateLimitError: class extends hoisted.FakeStripeError {},
    StripeSignatureVerificationError: hoisted.FakeStripeSignatureVerificationError,
  };
  return { default: FakeStripe };
});

vi.mock("@/lib/env", () => ({
  env: { PAYMENT_SECRET_KEY: "sk_test_fake", PAYMENT_WEBHOOK_SECRET: "whsec_fake" },
}));

describe("stripe provider", () => {
  beforeEach(() => {
    hoisted.createMock.mockReset();
    hoisted.constructEventMock.mockReset();
  });

  it("creates a payment intent and returns a client secret", async () => {
    hoisted.createMock.mockResolvedValue({
      id: "pi_123",
      status: "requires_payment_method",
      client_secret: "pi_123_secret_abc",
    });

    const { createStripeProvider } = await import("@/lib/payments/stripe/provider");
    const provider = createStripeProvider();

    const result = await provider.createPaymentIntent({
      idempotencyKey: "idem-1",
      amountMinorUnits: 150250,
      currency: "AED",
      description: "Invoice INV-TEST",
      customerEmail: "customer@example.com",
    });

    expect(result.providerIntentId).toBe("pi_123");
    expect(result.clientSecret).toBe("pi_123_secret_abc");
    expect(hoisted.createMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 150250, currency: "aed" }),
      expect.objectContaining({ idempotencyKey: "idem-1" }),
    );
  });

  it("wraps a Stripe connection error as a transient PaymentProviderError", async () => {
    hoisted.createMock.mockRejectedValue(new hoisted.FakeStripeConnectionError("network blip"));

    const { createStripeProvider } = await import("@/lib/payments/stripe/provider");
    const { PaymentProviderError } = await import("@/lib/payments/errors");
    const provider = createStripeProvider();

    await expect(
      provider.createPaymentIntent({
        idempotencyKey: "idem-2",
        amountMinorUnits: 1000,
        currency: "AED",
        description: "test",
        customerEmail: "a@b.com",
      }),
    ).rejects.toBeInstanceOf(PaymentProviderError);
    await expect(
      provider.createPaymentIntent({
        idempotencyKey: "idem-2",
        amountMinorUnits: 1000,
        currency: "AED",
        description: "test",
        customerEmail: "a@b.com",
      }),
    ).rejects.toMatchObject({ transient: true });
  });

  it("verifies a webhook signature and returns the parsed event", async () => {
    hoisted.constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_123" } },
    });

    const { createStripeProvider } = await import("@/lib/payments/stripe/provider");
    const provider = createStripeProvider();

    const verified = provider.verifyWebhookSignature({
      rawBody: "{}",
      signatureHeader: "t=1,v1=abc",
    });

    expect(verified.providerEventId).toBe("evt_1");
    expect(verified.eventType).toBe("payment_intent.succeeded");
    expect(verified.relatedProviderIntentId).toBe("pi_123");
  });

  it("throws WebhookSignatureError on an invalid signature and never returns an event", async () => {
    hoisted.constructEventMock.mockImplementation(() => {
      throw new hoisted.FakeStripeSignatureVerificationError("signature mismatch");
    });

    const { createStripeProvider } = await import("@/lib/payments/stripe/provider");
    const { WebhookSignatureError } = await import("@/lib/payments/errors");
    const provider = createStripeProvider();

    expect(() =>
      provider.verifyWebhookSignature({ rawBody: "{}", signatureHeader: "bad-sig" }),
    ).toThrow(WebhookSignatureError);
  });
});
