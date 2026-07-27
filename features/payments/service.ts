import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getPaymentProvider } from "@/lib/payments";
import { IdempotencyConflictError } from "@/lib/payments/errors";
import { getOrderForCustomer } from "@/features/vendor-orders/repository";
import { notifyPaymentComplete, notifyPaymentFailed } from "@/features/notifications/service";
import * as repo from "./repository";
import { assertPaymentIntentTransition, assertRefundTransition } from "./state-machines";
import type { CreateRefundInput } from "./schemas";
import type { PayableType } from "@prisma/client";

// Platform's cut of a successful transaction — a placeholder flat rate pending
// a real per-vendor/per-garage commission-rate policy (out of scope this
// sprint). Computed on the pre-VAT subtotal, since VAT is collected on behalf
// of the government, not platform revenue. Follows the VAT_RATE_BPS convention
// used by features/vendor-orders and features/repair-orders.
const PLATFORM_COMMISSION_RATE_BPS = 1000; // 10.00%

const IDEMPOTENCY_TTL_HOURS = 24;

function hashRequest(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// ── Invoice creation (checkout entry points) ─────────────────────────────────

type LineItem = {
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
  totalMinorUnits: number;
};

/** VendorOrder's deferred checkout step (Sprint 8) — creates an Invoice for an
 * existing order, idempotently. Does not touch VendorOrder's schema/status;
 * the order proceeds through its own lifecycle independently (ADR-013). */
export async function createInvoiceForVendorOrder(customerId: string, orderId: string) {
  const existing = await repo.findInvoiceByPayable("VENDOR_ORDER", orderId);
  if (existing) return existing;

  const order = await getOrderForCustomer(orderId, customerId);
  if (!order) throw new NotFoundError("Order");

  const vendorOrgId = await repo.getVendorOrganizationId(order.vendorId);
  if (!vendorOrgId) throw new NotFoundError("Vendor organization");

  const lineItems: LineItem[] = order.items.map((item) => ({
    description: item.partNameSnapshot,
    quantity: item.quantity,
    unitPriceMinorUnits: item.unitPriceMinorUnits,
    totalMinorUnits: item.totalMinorUnits,
  }));

  const invoice = await repo.createInvoice({
    invoiceNumber: repo.generateInvoiceNumber(),
    payableType: "VENDOR_ORDER",
    payableId: order.id,
    customerId,
    recipientOrganizationId: vendorOrgId,
    subtotalMinorUnits: order.subtotalMinorUnits,
    vatMinorUnits: order.vatMinorUnits,
    totalMinorUnits: order.totalMinorUnits,
    currency: order.currency,
    lineItemsSnapshot: lineItems,
  });

  await repo.createAuditLog({
    userId: customerId,
    action: "INVOICE_ISSUED",
    resourceId: invoice.id,
    metadata: {
      payableType: "VENDOR_ORDER",
      payableId: order.id,
      totalMinorUnits: invoice.totalMinorUnits,
    },
  });

  return invoice;
}

/** RepairOrder's finalizeInvoice() (COMPLETED -> INVOICED) wiring — called by
 * features/repair-orders/service.ts with data it already has loaded, avoiding
 * a second fetch. Idempotent: returns the existing Invoice if one was already
 * created for this repair order. */
export async function ensureInvoiceForRepairOrder(input: {
  repairOrderId: string;
  garageId: string;
  customerId: string;
  issuedByUserId?: string;
  subtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  jobs: Array<{
    description: string;
    hours: number;
    rateMinorUnits: number;
    totalMinorUnits: number;
  }>;
  parts: Array<{
    partName: string;
    quantity: number;
    unitPriceMinorUnits: number;
    totalMinorUnits: number;
  }>;
}) {
  const existing = await repo.findInvoiceByPayable("REPAIR_ORDER", input.repairOrderId);
  if (existing) return existing;

  const garageOrgId = await repo.getGarageOrganizationId(input.garageId);
  if (!garageOrgId) throw new NotFoundError("Garage organization");

  const lineItems: LineItem[] = [
    ...input.jobs.map((j) => ({
      description: `Labor: ${j.description}`,
      quantity: j.hours,
      unitPriceMinorUnits: j.rateMinorUnits,
      totalMinorUnits: j.totalMinorUnits,
    })),
    ...input.parts.map((p) => ({
      description: p.partName,
      quantity: p.quantity,
      unitPriceMinorUnits: p.unitPriceMinorUnits,
      totalMinorUnits: p.totalMinorUnits,
    })),
  ];

  const invoice = await repo.createInvoice({
    invoiceNumber: repo.generateInvoiceNumber(),
    payableType: "REPAIR_ORDER",
    payableId: input.repairOrderId,
    customerId: input.customerId,
    recipientOrganizationId: garageOrgId,
    subtotalMinorUnits: input.subtotalMinorUnits,
    vatMinorUnits: input.vatMinorUnits,
    totalMinorUnits: input.totalMinorUnits,
    currency: input.currency,
    lineItemsSnapshot: lineItems,
  });

  await repo.createAuditLog({
    userId: input.issuedByUserId ?? null,
    action: "INVOICE_ISSUED",
    resourceId: invoice.id,
    metadata: {
      payableType: "REPAIR_ORDER",
      payableId: input.repairOrderId,
      totalMinorUnits: invoice.totalMinorUnits,
    },
  });

  return invoice;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getMyInvoice(customerId: string, invoiceId: string) {
  const invoice = await repo.getInvoiceWithPaymentsForCustomer(invoiceId, customerId);
  if (!invoice) throw new NotFoundError("Invoice");
  return invoice;
}

export async function getMyInvoiceByPayable(
  customerId: string,
  payableType: PayableType,
  payableId: string,
) {
  const invoice = await repo.findInvoiceByPayable(payableType, payableId);
  if (!invoice || invoice.customerId !== customerId) throw new NotFoundError("Invoice");
  return invoice;
}

// ── Checkout: create a PaymentIntent against an Invoice ──────────────────────

export async function createPaymentIntentForInvoice(
  user: { id: string; email: string },
  invoiceId: string,
  idempotencyKeyHeader: string,
) {
  const invoice = await repo.getInvoiceById(invoiceId);
  if (!invoice) throw new NotFoundError("Invoice");
  if (invoice.customerId !== user.id)
    throw new ForbiddenError("This invoice does not belong to you.");
  if (invoice.status === "PAID") throw new ConflictError("This invoice has already been paid.");
  if (invoice.status === "VOID") throw new ConflictError("This invoice has been voided.");

  const scope = "payment-intent:create";
  const requestHash = hashRequest({ invoiceId });

  const existingKey = await repo.findIdempotencyKey(scope, idempotencyKeyHeader);
  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      throw new IdempotencyConflictError();
    }
    if (existingKey.status === "COMPLETED" && existingKey.responseSnapshot) {
      return existingKey.responseSnapshot as unknown as {
        invoiceId: string;
        paymentIntentId: string;
        clientSecret: string;
        status: string;
        amountMinorUnits: number;
        currency: string;
      };
    }
    if (existingKey.status === "IN_PROGRESS") {
      throw new ConflictError("A payment intent is already being created for this request.");
    }
    // FAILED — fall through and retry.
  } else {
    await repo.createIdempotencyKey({
      scope,
      key: idempotencyKeyHeader,
      requestHash,
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
    });
  }
  const keyRow = existingKey ?? (await repo.findIdempotencyKey(scope, idempotencyKeyHeader))!;

  try {
    const reusable = await repo.findActivePaymentIntentForInvoice(invoiceId);
    let paymentIntentRow;
    if (reusable && reusable.clientSecret) {
      paymentIntentRow = reusable;
    } else {
      const provider = getPaymentProvider();
      const result = await provider.createPaymentIntent({
        idempotencyKey: `${invoiceId}:${idempotencyKeyHeader}`,
        amountMinorUnits: invoice.totalMinorUnits,
        currency: invoice.currency,
        description: `AutoIQ Invoice ${invoice.invoiceNumber}`,
        customerEmail: user.email,
        metadata: {
          invoiceId: invoice.id,
          payableType: invoice.payableType,
          payableId: invoice.payableId,
        },
      });

      paymentIntentRow = await repo.createPaymentIntent({
        invoiceId: invoice.id,
        provider: provider.name,
        providerIntentId: result.providerIntentId,
        amountMinorUnits: invoice.totalMinorUnits,
        currency: invoice.currency,
        clientSecret: result.clientSecret,
        idempotencyKeyId: keyRow.id,
      });

      await repo.createAuditLog({
        userId: user.id,
        action: "PAYMENT_INTENT_CREATED",
        resourceId: paymentIntentRow.id,
        metadata: { invoiceId: invoice.id, amountMinorUnits: invoice.totalMinorUnits },
      });
    }

    const response = {
      invoiceId: invoice.id,
      paymentIntentId: paymentIntentRow.id,
      clientSecret: paymentIntentRow.clientSecret ?? "",
      status: paymentIntentRow.status,
      amountMinorUnits: paymentIntentRow.amountMinorUnits,
      currency: paymentIntentRow.currency,
    };

    await repo.completeIdempotencyKey(keyRow.id, response);
    return response;
  } catch (err) {
    await repo.failIdempotencyKey(keyRow.id);
    throw err;
  }
}

// ── Webhook processing ───────────────────────────────────────────────────────

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** Redacted snapshot only — brand/last4/id/amount/status, never a PAN. See
 * ADR-013's PCI boundary. */
function redactedSnapshot(payload: Record<string, unknown>): Prisma.InputJsonValue {
  const paymentMethodTypes = payload.payment_method_types;
  return {
    id: typeof payload.id === "string" ? payload.id : null,
    amount: typeof payload.amount === "number" ? payload.amount : null,
    currency: typeof payload.currency === "string" ? payload.currency : null,
    status: typeof payload.status === "string" ? payload.status : null,
    paymentMethodTypes: Array.isArray(paymentMethodTypes) ? paymentMethodTypes : null,
  };
}

function extractChargeId(payload: Record<string, unknown>): string | undefined {
  const latestCharge = payload.latest_charge;
  if (typeof latestCharge === "string") return latestCharge;
  if (typeof latestCharge === "object" && latestCharge !== null) {
    const id = (latestCharge as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

async function handlePaymentSucceeded(
  paymentIntentRow: NonNullable<Awaited<ReturnType<typeof repo.getPaymentIntentById>>>,
  payload: Record<string, unknown>,
) {
  if (paymentIntentRow.status === "SUCCEEDED") return; // already applied — idempotent no-op
  assertPaymentIntentTransition(paymentIntentRow.status, "SUCCEEDED");

  const invoice = await db.$transaction(async (tx) => {
    await repo.updatePaymentIntentStatus(tx, paymentIntentRow.id, "SUCCEEDED");

    const transaction = await repo.createPaymentTransaction(tx, {
      paymentIntentId: paymentIntentRow.id,
      type: "SALE",
      status: "SUCCEEDED",
      amountMinorUnits: paymentIntentRow.amountMinorUnits,
      currency: paymentIntentRow.currency,
      providerTransactionId: extractChargeId(payload),
      rawResponseSnapshot: redactedSnapshot(payload),
    });

    const invoice = await repo.updateInvoiceStatus(tx, paymentIntentRow.invoiceId, "PAID", {
      paidAt: new Date(),
    });

    const commissionAmount = Math.round(
      (invoice.subtotalMinorUnits * PLATFORM_COMMISSION_RATE_BPS) / 10000,
    );
    await repo.createCommission(tx, {
      transactionId: transaction.id,
      recipientOrganizationId: invoice.recipientOrganizationId,
      grossAmountMinorUnits: transaction.amountMinorUnits,
      rateBasisPoints: PLATFORM_COMMISSION_RATE_BPS,
      commissionAmountMinorUnits: commissionAmount,
      payoutAmountMinorUnits: transaction.amountMinorUnits - commissionAmount,
      currency: transaction.currency,
    });

    await repo.createAuditLog({
      userId: null,
      action: "PAYMENT_INTENT_STATUS_CHANGED",
      resourceId: paymentIntentRow.id,
      metadata: { to: "SUCCEEDED" },
    });
    await repo.createAuditLog({
      userId: null,
      action: "PAYMENT_TRANSACTION_RECORDED",
      resourceId: transaction.id,
      metadata: { amountMinorUnits: transaction.amountMinorUnits, type: "SALE" },
    });
    await repo.createAuditLog({
      userId: null,
      action: "COMMISSION_RECORDED",
      resourceId: transaction.id,
      metadata: { commissionAmountMinorUnits: commissionAmount },
    });

    return invoice;
  });

  void notifyPaymentComplete(invoice.customerId, invoice.id, {
    invoiceNumber: invoice.invoiceNumber,
    amountMinorUnits: invoice.totalMinorUnits,
    currency: invoice.currency,
  });
}

async function handlePaymentFailed(
  paymentIntentRow: NonNullable<Awaited<ReturnType<typeof repo.getPaymentIntentById>>>,
  payload: Record<string, unknown>,
) {
  if (paymentIntentRow.status === "FAILED") return; // idempotent no-op
  assertPaymentIntentTransition(paymentIntentRow.status, "FAILED");

  const lastError = toRecord(payload.last_payment_error);
  const failureMessage =
    typeof lastError.message === "string" ? lastError.message : "Payment failed";
  const failureCode = typeof lastError.code === "string" ? lastError.code : undefined;

  await db.$transaction(async (tx) => {
    await repo.updatePaymentIntentStatus(tx, paymentIntentRow.id, "FAILED", {
      failureReason: failureMessage,
    });
    await repo.createPaymentTransaction(tx, {
      paymentIntentId: paymentIntentRow.id,
      type: "SALE",
      status: "FAILED",
      amountMinorUnits: paymentIntentRow.amountMinorUnits,
      currency: paymentIntentRow.currency,
      failureCode,
      failureMessage,
      rawResponseSnapshot: redactedSnapshot(payload),
    });
    await repo.createAuditLog({
      userId: null,
      action: "PAYMENT_INTENT_STATUS_CHANGED",
      resourceId: paymentIntentRow.id,
      metadata: { to: "FAILED", reason: failureMessage },
    });
  });

  const invoice = await repo.getInvoiceById(paymentIntentRow.invoiceId);
  if (invoice) {
    void notifyPaymentFailed(invoice.customerId, invoice.id, {
      invoiceNumber: invoice.invoiceNumber,
      amountMinorUnits: paymentIntentRow.amountMinorUnits,
      currency: paymentIntentRow.currency,
      reason: failureMessage,
    });
  }
}

async function handleChargeRefunded(payload: Record<string, unknown>) {
  const chargeId = typeof payload.id === "string" ? payload.id : undefined;
  if (!chargeId) return;

  const transaction = await repo.getTransactionByProviderTransactionId(chargeId);
  if (!transaction) return; // nothing local to reconcile yet

  const amountRefunded = typeof payload.amount_refunded === "number" ? payload.amount_refunded : 0;

  const pending = await repo.findPendingRefundForTransaction(transaction.id);

  await db.$transaction(async (tx) => {
    let refund = pending;
    if (!refund) {
      refund = await repo.createRefund(tx, {
        transactionId: transaction.id,
        status: "PROCESSING",
        amountMinorUnits: amountRefunded,
        currency: transaction.currency,
        reason: "Refunded via provider (no matching local request)",
      });
    }

    if (refund.status === "SUCCEEDED") return; // idempotent no-op
    assertRefundTransition(refund.status, "SUCCEEDED");
    await repo.updateRefundStatus(tx, refund.id, "SUCCEEDED", { processedAt: new Date() });

    const commission = await repo.getCommissionByTransactionId(transaction.id);
    if (commission && commission.status !== "REVERSED") {
      await repo.updateCommissionStatus(tx, commission.id, "REVERSED");
    }

    const totalRefunded = await repo.sumSucceededRefunds(tx, transaction.id);
    const invoice = transaction.paymentIntent.invoice;
    const newStatus = totalRefunded >= invoice.totalMinorUnits ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await repo.updateInvoiceStatus(tx, invoice.id, newStatus);

    await repo.createAuditLog({
      userId: null,
      action: "REFUND_STATUS_CHANGED",
      resourceId: refund.id,
      metadata: { to: "SUCCEEDED", amountMinorUnits: amountRefunded },
    });
  });
}

export async function processStripeWebhook(rawBody: string, signatureHeader: string) {
  const provider = getPaymentProvider();
  // Throws WebhookSignatureError on a bad/missing signature — never processed.
  const verified = provider.verifyWebhookSignature({ rawBody, signatureHeader });

  const localIntent = verified.relatedProviderIntentId
    ? await repo.getPaymentIntentByProviderIntentId(provider.name, verified.relatedProviderIntentId)
    : null;

  let event;
  try {
    event = await repo.createWebhookEvent({
      provider: provider.name,
      providerEventId: verified.providerEventId,
      eventType: verified.eventType,
      payloadRaw: verified.payload as Prisma.InputJsonValue,
      signatureVerified: true,
      paymentIntentId: localIntent?.id,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Duplicate delivery — already processed, never re-applied.
      return { status: "already_processed" as const };
    }
    throw err;
  }

  await repo.createAuditLog({
    userId: null,
    action: "WEBHOOK_EVENT_RECEIVED",
    resourceId: event.id,
    metadata: { eventType: verified.eventType, provider: provider.name },
  });

  if (!localIntent) {
    // Webhook arrived before/without a matching local row — stored as RECEIVED
    // for later reconciliation (ADR-013; no job runner exists yet).
    return { status: "no_match" as const };
  }

  try {
    const payload = toRecord(verified.payload);
    switch (verified.eventType) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(localIntent, payload);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(localIntent, payload);
        break;
      case "charge.refunded":
        await handleChargeRefunded(payload);
        break;
      default:
        await repo.updateWebhookEventStatus(event.id, "IGNORED", { processedAt: new Date() });
        return { status: "ignored" as const };
    }
    await repo.updateWebhookEventStatus(event.id, "PROCESSED", { processedAt: new Date() });
    return { status: "processed" as const };
  } catch (err) {
    await repo.updateWebhookEventStatus(event.id, "FAILED", {
      lastError: err instanceof Error ? err.message : "Unknown error",
    });
    await repo.createAuditLog({
      userId: null,
      action: "WEBHOOK_EVENT_PROCESSING_FAILED",
      resourceId: event.id,
      metadata: { error: err instanceof Error ? err.message : "unknown" },
    });
    throw err;
  }
}

// ── Admin: refunds ────────────────────────────────────────────────────────────

export async function requestRefund(
  adminUserId: string,
  transactionId: string,
  input: CreateRefundInput,
) {
  const transaction = await repo.getTransactionById(transactionId);
  if (!transaction) throw new NotFoundError("Payment transaction");
  const isRefundableType = transaction.type === "CAPTURE" || transaction.type === "SALE";
  if (transaction.status !== "SUCCEEDED" || !isRefundableType) {
    throw new ConflictError("Only a successful capture/sale transaction can be refunded.");
  }
  if (!transaction.providerTransactionId) {
    throw new ConflictError("This transaction has no provider reference to refund against.");
  }

  const alreadyRefunded = await repo.sumSucceededRefunds(db, transactionId);
  const remaining = transaction.amountMinorUnits - alreadyRefunded;
  const amountMinorUnits = input.amountMinorUnits ?? remaining;
  if (amountMinorUnits <= 0 || amountMinorUnits > remaining) {
    throw new ValidationError(`Refund amount must be between 1 and ${remaining} minor units.`);
  }

  const refund = await repo.createRefund(db, {
    transactionId,
    requestedById: adminUserId,
    status: "REQUESTED",
    amountMinorUnits,
    currency: transaction.currency,
    reason: input.reason,
  });

  await repo.createAuditLog({
    userId: adminUserId,
    action: "REFUND_REQUESTED",
    resourceId: refund.id,
    metadata: { transactionId, amountMinorUnits },
  });

  assertRefundTransition("REQUESTED", "PROCESSING");
  await repo.updateRefundStatus(db, refund.id, "PROCESSING");

  const provider = getPaymentProvider();
  try {
    const result = await provider.createRefund({
      providerTransactionId: transaction.providerTransactionId,
      amountMinorUnits,
      currency: transaction.currency,
      reason: input.reason,
      idempotencyKey: `refund:${refund.id}`,
    });

    if (result.status === "succeeded") {
      assertRefundTransition("PROCESSING", "SUCCEEDED");
      await db.$transaction(async (tx) => {
        await repo.updateRefundStatus(tx, refund.id, "SUCCEEDED", {
          providerRefundId: result.providerRefundId,
          processedAt: new Date(),
        });
        const commission = await repo.getCommissionByTransactionId(transactionId);
        if (commission && commission.status !== "REVERSED") {
          await repo.updateCommissionStatus(tx, commission.id, "REVERSED");
        }
        const totalRefunded = await repo.sumSucceededRefunds(tx, transactionId);
        const invoice = transaction.paymentIntent.invoice;
        const newStatus =
          totalRefunded >= invoice.totalMinorUnits ? "REFUNDED" : "PARTIALLY_REFUNDED";
        await repo.updateInvoiceStatus(tx, invoice.id, newStatus);
      });
    } else if (result.status === "failed") {
      assertRefundTransition("PROCESSING", "FAILED");
      await repo.updateRefundStatus(db, refund.id, "FAILED", {
        providerRefundId: result.providerRefundId,
        failureReason: "Refund failed at the provider",
      });
    } else {
      await repo.updateRefundStatus(db, refund.id, "PROCESSING", {
        providerRefundId: result.providerRefundId,
      });
    }
  } catch (err) {
    await repo.updateRefundStatus(db, refund.id, "FAILED", {
      failureReason: err instanceof Error ? err.message : "Refund request failed",
    });
    await repo.createAuditLog({
      userId: adminUserId,
      action: "REFUND_STATUS_CHANGED",
      resourceId: refund.id,
      metadata: { to: "FAILED" },
    });
    throw err;
  }

  await repo.createAuditLog({
    userId: adminUserId,
    action: "REFUND_STATUS_CHANGED",
    resourceId: refund.id,
    metadata: { transactionId },
  });

  return repo.getTransactionById(transactionId);
}
