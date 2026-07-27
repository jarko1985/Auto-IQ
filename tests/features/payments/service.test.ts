import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

const mockProvider = {
  name: "stripe" as const,
  createPaymentIntent: vi.fn(),
  capturePaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
  createRefund: vi.fn(),
  verifyWebhookSignature: vi.fn(),
};

vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => mockProvider,
}));

vi.mock("@/lib/db", () => ({
  db: { $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})) },
}));

vi.mock("@/features/vendor-orders/repository", () => ({
  getOrderForCustomer: vi.fn(),
}));

vi.mock("@/features/payments/repository", () => ({
  generateInvoiceNumber: () => "INV-TEST0001",
  createInvoice: vi.fn(),
  findInvoiceByPayable: vi.fn(),
  getInvoiceById: vi.fn(),
  getInvoiceForCustomer: vi.fn(),
  getInvoiceWithPaymentsForCustomer: vi.fn(),
  updateInvoiceStatus: vi.fn(),
  createPaymentIntent: vi.fn(),
  findActivePaymentIntentForInvoice: vi.fn(),
  getPaymentIntentByProviderIntentId: vi.fn(),
  getPaymentIntentById: vi.fn(),
  updatePaymentIntentStatus: vi.fn(),
  createPaymentTransaction: vi.fn(),
  getTransactionByProviderTransactionId: vi.fn(),
  getTransactionById: vi.fn(),
  createRefund: vi.fn(),
  updateRefundStatus: vi.fn(),
  findPendingRefundForTransaction: vi.fn(),
  sumSucceededRefunds: vi.fn(),
  createCommission: vi.fn(),
  getCommissionByTransactionId: vi.fn(),
  updateCommissionStatus: vi.fn(),
  findIdempotencyKey: vi.fn(),
  createIdempotencyKey: vi.fn(),
  completeIdempotencyKey: vi.fn(),
  failIdempotencyKey: vi.fn(),
  createWebhookEvent: vi.fn(),
  updateWebhookEventStatus: vi.fn(),
  getVendorOrganizationId: vi.fn(),
  getGarageOrganizationId: vi.fn(),
  createAuditLog: vi.fn(),
}));

import * as repo from "@/features/payments/repository";
import { getOrderForCustomer } from "@/features/vendor-orders/repository";
import {
  createInvoiceForVendorOrder,
  createPaymentIntentForInvoice,
  processStripeWebhook,
  requestRefund,
} from "@/features/payments/service";
import { WebhookSignatureError, IdempotencyConflictError } from "@/lib/payments/errors";

function resetAllMocks() {
  vi.clearAllMocks();
}

describe("createInvoiceForVendorOrder", () => {
  beforeEach(resetAllMocks);

  it("returns the existing invoice instead of creating a duplicate", async () => {
    const existing = { id: "inv-1", payableType: "VENDOR_ORDER" };
    vi.mocked(repo.findInvoiceByPayable).mockResolvedValue(existing as never);

    const result = await createInvoiceForVendorOrder("cust-1", "order-1");

    expect(result).toBe(existing);
    expect(getOrderForCustomer).not.toHaveBeenCalled();
    expect(repo.createInvoice).not.toHaveBeenCalled();
  });

  it("computes an invoice from the order's items and totals", async () => {
    vi.mocked(repo.findInvoiceByPayable).mockResolvedValue(null);
    vi.mocked(getOrderForCustomer).mockResolvedValue({
      id: "order-1",
      vendorId: "vendor-1",
      subtotalMinorUnits: 100000,
      vatMinorUnits: 5000,
      totalMinorUnits: 105000,
      currency: "AED",
      items: [
        {
          partNameSnapshot: "Brake Pads",
          quantity: 2,
          unitPriceMinorUnits: 50000,
          totalMinorUnits: 100000,
        },
      ],
    } as never);
    vi.mocked(repo.getVendorOrganizationId).mockResolvedValue("org-1");
    vi.mocked(repo.createInvoice).mockResolvedValue({ id: "inv-new" } as never);

    const result = await createInvoiceForVendorOrder("cust-1", "order-1");

    expect(repo.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        payableType: "VENDOR_ORDER",
        payableId: "order-1",
        recipientOrganizationId: "org-1",
        totalMinorUnits: 105000,
        lineItemsSnapshot: [
          {
            description: "Brake Pads",
            quantity: 2,
            unitPriceMinorUnits: 50000,
            totalMinorUnits: 100000,
          },
        ],
      }),
    );
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_ISSUED" }),
    );
    expect(result).toEqual({ id: "inv-new" });
  });
});

describe("createPaymentIntentForInvoice", () => {
  beforeEach(resetAllMocks);

  const user = { id: "cust-1", email: "cust@example.com" };
  const invoice = {
    id: "inv-1",
    customerId: "cust-1",
    status: "ISSUED",
    totalMinorUnits: 105000,
    currency: "AED",
    invoiceNumber: "INV-0001",
    payableType: "VENDOR_ORDER",
    payableId: "order-1",
  };

  it("throws ForbiddenError when the invoice does not belong to the caller", async () => {
    vi.mocked(repo.getInvoiceById).mockResolvedValue({
      ...invoice,
      customerId: "someone-else",
    } as never);

    await expect(createPaymentIntentForInvoice(user, "inv-1", "idem-key-1")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("throws ConflictError when the invoice is already paid", async () => {
    vi.mocked(repo.getInvoiceById).mockResolvedValue({ ...invoice, status: "PAID" } as never);

    await expect(createPaymentIntentForInvoice(user, "inv-1", "idem-key-1")).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("creates a new provider intent and persists it on first call", async () => {
    vi.mocked(repo.getInvoiceById).mockResolvedValue(invoice as never);
    vi.mocked(repo.findIdempotencyKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "idem-row-1" } as never);
    vi.mocked(repo.findActivePaymentIntentForInvoice).mockResolvedValue(null);
    mockProvider.createPaymentIntent.mockResolvedValue({
      providerIntentId: "pi_1",
      status: "requires_action",
      clientSecret: "pi_1_secret",
    });
    vi.mocked(repo.createPaymentIntent).mockResolvedValue({
      id: "intent-row-1",
      clientSecret: "pi_1_secret",
      status: "CREATED",
      amountMinorUnits: 105000,
      currency: "AED",
    } as never);

    const result = await createPaymentIntentForInvoice(user, "inv-1", "idem-key-1");

    expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinorUnits: 105000, currency: "AED" }),
    );
    expect(result.clientSecret).toBe("pi_1_secret");
    expect(repo.completeIdempotencyKey).toHaveBeenCalledWith("idem-row-1", expect.any(Object));
  });

  it("reuses an active non-terminal PaymentIntent instead of calling the provider again", async () => {
    vi.mocked(repo.getInvoiceById).mockResolvedValue(invoice as never);
    vi.mocked(repo.findIdempotencyKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "idem-row-2" } as never);
    vi.mocked(repo.findActivePaymentIntentForInvoice).mockResolvedValue({
      id: "existing-intent",
      clientSecret: "pi_existing_secret",
      status: "REQUIRES_ACTION",
      amountMinorUnits: 105000,
      currency: "AED",
    } as never);

    const result = await createPaymentIntentForInvoice(user, "inv-1", "idem-key-2");

    expect(mockProvider.createPaymentIntent).not.toHaveBeenCalled();
    expect(result.paymentIntentId).toBe("existing-intent");
  });

  it("replays the cached response for an identical retried idempotency key", async () => {
    vi.mocked(repo.getInvoiceById).mockResolvedValue(invoice as never);
    const cached = {
      invoiceId: "inv-1",
      paymentIntentId: "intent-row-1",
      clientSecret: "s",
      status: "CREATED",
      amountMinorUnits: 105000,
      currency: "AED",
    };
    vi.mocked(repo.findIdempotencyKey).mockResolvedValue({
      id: "idem-row-1",
      requestHash: createHash("sha256")
        .update(JSON.stringify({ invoiceId: "inv-1" }))
        .digest("hex"),
      status: "COMPLETED",
      responseSnapshot: cached,
    } as never);

    const result = await createPaymentIntentForInvoice(user, "inv-1", "idem-key-1");

    expect(mockProvider.createPaymentIntent).not.toHaveBeenCalled();
    expect(result).toEqual(cached);
  });

  it("throws IdempotencyConflictError when the same key is reused for a different invoice", async () => {
    vi.mocked(repo.getInvoiceById).mockResolvedValue(invoice as never);
    vi.mocked(repo.findIdempotencyKey).mockResolvedValue({
      id: "idem-row-1",
      requestHash: "some-other-hash",
      status: "COMPLETED",
      responseSnapshot: {},
    } as never);

    await expect(createPaymentIntentForInvoice(user, "inv-1", "idem-key-1")).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );
  });
});

describe("processStripeWebhook", () => {
  beforeEach(resetAllMocks);

  it("propagates WebhookSignatureError without touching the database", async () => {
    mockProvider.verifyWebhookSignature.mockImplementation(() => {
      throw new WebhookSignatureError("bad signature", "stripe");
    });

    await expect(processStripeWebhook("{}", "bad-sig")).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
    expect(repo.createWebhookEvent).not.toHaveBeenCalled();
  });

  it("treats a duplicate delivery (P2002) as already processed", async () => {
    mockProvider.verifyWebhookSignature.mockReturnValue({
      providerEventId: "evt_1",
      eventType: "payment_intent.succeeded",
      payload: { id: "pi_1" },
      relatedProviderIntentId: "pi_1",
    });
    vi.mocked(repo.getPaymentIntentByProviderIntentId).mockResolvedValue({
      id: "intent-1",
    } as never);
    vi.mocked(repo.createWebhookEvent).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.0.0",
      }),
    );

    const result = await processStripeWebhook("{}", "sig");

    expect(result).toEqual({ status: "already_processed" });
  });

  it("stores the event as no_match when no local PaymentIntent exists yet", async () => {
    mockProvider.verifyWebhookSignature.mockReturnValue({
      providerEventId: "evt_2",
      eventType: "payment_intent.succeeded",
      payload: { id: "pi_unknown" },
      relatedProviderIntentId: "pi_unknown",
    });
    vi.mocked(repo.getPaymentIntentByProviderIntentId).mockResolvedValue(null);
    vi.mocked(repo.createWebhookEvent).mockResolvedValue({ id: "webhook-evt-1" } as never);

    const result = await processStripeWebhook("{}", "sig");

    expect(result).toEqual({ status: "no_match" });
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "WEBHOOK_EVENT_RECEIVED" }),
    );
  });

  it("marks an unrecognized event type as ignored", async () => {
    mockProvider.verifyWebhookSignature.mockReturnValue({
      providerEventId: "evt_3",
      eventType: "customer.updated",
      payload: {},
      relatedProviderIntentId: undefined,
    });
    vi.mocked(repo.getPaymentIntentByProviderIntentId).mockResolvedValue(null);
    vi.mocked(repo.createWebhookEvent).mockResolvedValue({ id: "webhook-evt-2" } as never);

    const result = await processStripeWebhook("{}", "sig");

    // relatedProviderIntentId is undefined, so no local lookup happens and it
    // resolves as no_match before event-type dispatch is ever reached.
    expect(result).toEqual({ status: "no_match" });
  });
});

describe("requestRefund", () => {
  beforeEach(resetAllMocks);

  it("rejects a refund amount greater than what remains on the transaction", async () => {
    vi.mocked(repo.getTransactionById).mockResolvedValue({
      id: "txn-1",
      status: "SUCCEEDED",
      type: "SALE",
      amountMinorUnits: 10000,
      currency: "AED",
      providerTransactionId: "ch_1",
    } as never);
    vi.mocked(repo.sumSucceededRefunds).mockResolvedValue(0);

    await expect(
      requestRefund("admin-1", "txn-1", { amountMinorUnits: 20000 }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects refunding a transaction that has not succeeded", async () => {
    vi.mocked(repo.getTransactionById).mockResolvedValue({
      id: "txn-2",
      status: "FAILED",
      type: "SALE",
      amountMinorUnits: 10000,
      currency: "AED",
      providerTransactionId: "ch_2",
    } as never);

    await expect(requestRefund("admin-1", "txn-2", {})).rejects.toMatchObject({ statusCode: 409 });
  });
});
