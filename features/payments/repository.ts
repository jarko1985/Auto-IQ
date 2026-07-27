import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type {
  AuditAction,
  CommissionStatus,
  InvoiceStatus,
  PayableType,
  PaymentIntentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  Prisma,
  RefundStatus,
  WebhookEventStatus,
} from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export function generateInvoiceNumber(): string {
  return `INV-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export async function createInvoice(data: {
  invoiceNumber: string;
  payableType: PayableType;
  payableId: string;
  customerId: string;
  recipientOrganizationId: string;
  subtotalMinorUnits: number;
  vatMinorUnits: number;
  totalMinorUnits: number;
  currency: string;
  lineItemsSnapshot: Prisma.InputJsonValue;
}) {
  return db.invoice.create({
    data: {
      invoiceNumber: data.invoiceNumber,
      payableType: data.payableType,
      payableId: data.payableId,
      customerId: data.customerId,
      recipientOrganizationId: data.recipientOrganizationId,
      status: "ISSUED",
      subtotalMinorUnits: data.subtotalMinorUnits,
      vatMinorUnits: data.vatMinorUnits,
      totalMinorUnits: data.totalMinorUnits,
      currency: data.currency,
      lineItemsSnapshot: data.lineItemsSnapshot,
      issuedAt: new Date(),
    },
  });
}

export async function findInvoiceByPayable(payableType: PayableType, payableId: string) {
  return db.invoice.findFirst({ where: { payableType, payableId } });
}

export async function getInvoiceById(id: string) {
  return db.invoice.findUnique({ where: { id } });
}

export async function getInvoiceForCustomer(id: string, customerId: string) {
  return db.invoice.findFirst({ where: { id, customerId } });
}

export async function getInvoiceWithPaymentsForCustomer(id: string, customerId: string) {
  return db.invoice.findFirst({
    where: { id, customerId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      recipient: { select: { id: true, name: true } },
      paymentIntents: {
        orderBy: { createdAt: "desc" },
        include: { transactions: { include: { refunds: true } } },
      },
    },
  });
}

export async function updateInvoiceStatus(
  tx: TxClient | typeof db,
  id: string,
  status: InvoiceStatus,
  fields?: { paidAt?: Date; voidedAt?: Date },
) {
  return tx.invoice.update({
    where: { id },
    data: { status, ...fields },
  });
}

// ── Payment intents ───────────────────────────────────────────────────────────

export async function createPaymentIntent(data: {
  invoiceId: string;
  provider: string;
  providerIntentId: string;
  amountMinorUnits: number;
  currency: string;
  clientSecret: string;
  idempotencyKeyId?: string;
}) {
  return db.paymentIntent.create({ data });
}

/** Non-terminal PaymentIntents can be reused instead of asking Stripe to
 * create a new one — avoids duplicate checkout sessions for the same invoice
 * on page-refresh/retry. */
export async function findActivePaymentIntentForInvoice(invoiceId: string) {
  return db.paymentIntent.findFirst({
    where: { invoiceId, status: { in: ["CREATED", "REQUIRES_ACTION", "PROCESSING"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPaymentIntentByProviderIntentId(
  provider: string,
  providerIntentId: string,
) {
  return db.paymentIntent.findFirst({ where: { provider, providerIntentId } });
}

export async function getPaymentIntentById(id: string) {
  return db.paymentIntent.findUnique({ where: { id } });
}

export async function updatePaymentIntentStatus(
  tx: TxClient | typeof db,
  id: string,
  status: PaymentIntentStatus,
  fields?: { failureReason?: string },
) {
  return tx.paymentIntent.update({ where: { id }, data: { status, ...fields } });
}

// ── Payment transactions ─────────────────────────────────────────────────────

export async function createPaymentTransaction(
  tx: TxClient | typeof db,
  data: {
    paymentIntentId: string;
    type: PaymentTransactionType;
    status: PaymentTransactionStatus;
    amountMinorUnits: number;
    currency: string;
    providerTransactionId?: string;
    failureCode?: string;
    failureMessage?: string;
    rawResponseSnapshot?: Prisma.InputJsonValue;
  },
) {
  return tx.paymentTransaction.create({ data });
}

export async function getTransactionByProviderTransactionId(providerTransactionId: string) {
  return db.paymentTransaction.findFirst({
    where: { providerTransactionId },
    include: { paymentIntent: { include: { invoice: true } }, refunds: true, commission: true },
  });
}

export async function getTransactionById(id: string) {
  return db.paymentTransaction.findUnique({
    where: { id },
    include: { paymentIntent: { include: { invoice: true } }, refunds: true, commission: true },
  });
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export async function createRefund(
  tx: TxClient | typeof db,
  data: {
    transactionId: string;
    requestedById?: string;
    status: RefundStatus;
    amountMinorUnits: number;
    currency: string;
    reason?: string;
  },
) {
  return tx.refund.create({ data });
}

export async function updateRefundStatus(
  tx: TxClient | typeof db,
  id: string,
  status: RefundStatus,
  fields?: { providerRefundId?: string; failureReason?: string; processedAt?: Date },
) {
  return tx.refund.update({ where: { id }, data: { status, ...fields } });
}

export async function findPendingRefundForTransaction(transactionId: string) {
  return db.refund.findFirst({
    where: { transactionId, status: { in: ["REQUESTED", "PROCESSING"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function sumSucceededRefunds(tx: TxClient | typeof db, transactionId: string) {
  const result = await tx.refund.aggregate({
    where: { transactionId, status: "SUCCEEDED" },
    _sum: { amountMinorUnits: true },
  });
  return result._sum.amountMinorUnits ?? 0;
}

// ── Commission ────────────────────────────────────────────────────────────────

export async function createCommission(
  tx: TxClient | typeof db,
  data: {
    transactionId: string;
    recipientOrganizationId: string;
    grossAmountMinorUnits: number;
    rateBasisPoints: number;
    commissionAmountMinorUnits: number;
    payoutAmountMinorUnits: number;
    currency: string;
  },
) {
  return tx.commission.create({ data });
}

export async function getCommissionByTransactionId(transactionId: string) {
  return db.commission.findUnique({ where: { transactionId } });
}

export async function updateCommissionStatus(
  tx: TxClient | typeof db,
  id: string,
  status: CommissionStatus,
) {
  return tx.commission.update({ where: { id }, data: { status } });
}

// ── Idempotency keys ──────────────────────────────────────────────────────────

export async function findIdempotencyKey(scope: string, key: string) {
  return db.idempotencyKey.findUnique({ where: { scope_key: { scope, key } } });
}

export async function createIdempotencyKey(data: {
  scope: string;
  key: string;
  requestHash: string;
  expiresAt: Date;
}) {
  return db.idempotencyKey.create({ data });
}

export async function completeIdempotencyKey(id: string, responseSnapshot: Prisma.InputJsonValue) {
  return db.idempotencyKey.update({
    where: { id },
    data: { status: "COMPLETED", responseSnapshot },
  });
}

export async function failIdempotencyKey(id: string) {
  return db.idempotencyKey.update({ where: { id }, data: { status: "FAILED" } });
}

// ── Webhook events ────────────────────────────────────────────────────────────

export async function createWebhookEvent(data: {
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadRaw: Prisma.InputJsonValue;
  signatureVerified: boolean;
  paymentIntentId?: string;
}) {
  return db.webhookEvent.create({ data });
}

export async function updateWebhookEventStatus(
  id: string,
  status: WebhookEventStatus,
  fields?: { lastError?: string; processedAt?: Date },
) {
  return db.webhookEvent.update({
    where: { id },
    data: { status, ...fields, attempts: { increment: 1 } },
  });
}

// ── Cross-domain lookups (no Prisma relation — see ADR-013) ─────────────────

export async function getVendorOrganizationId(vendorId: string) {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    select: { organizationId: true },
  });
  return vendor?.organizationId;
}

export async function getGarageOrganizationId(garageId: string) {
  const garage = await db.garage.findUnique({
    where: { id: garageId },
    select: { organizationId: true },
  });
  return garage?.organizationId;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  userId: string | null;
  action: AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      resourceId: data.resourceId,
      metadata: data.metadata,
      ...(data.userId && { user: { connect: { id: data.userId } } }),
    },
  });
}
