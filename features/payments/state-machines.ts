import type {
  PaymentIntentStatus,
  PaymentTransactionStatus,
  RefundStatus,
  PayoutStatus,
} from "@prisma/client";
import { ConflictError } from "@/lib/errors";

/**
 * Explicit state graphs for the payment domain — same convention as
 * ALLOWED_TRANSITIONS in features/repair-orders/service.ts and
 * features/bookings/service.ts. Anything not listed for a given "from" state
 * is an invalid transition. See docs/adr/ADR-013-payment-architecture.md for
 * the reasoning behind each graph.
 *
 * These maps have no service layer consuming them yet (Sprint 12 is schema +
 * design only) — Prompt 19's features/payments/service.ts should import and
 * call the assert* helpers below rather than re-deriving the graphs.
 */

export const PAYMENT_INTENT_TRANSITIONS: Record<PaymentIntentStatus, PaymentIntentStatus[]> = {
  CREATED: ["REQUIRES_ACTION", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELED", "EXPIRED"],
  REQUIRES_ACTION: ["PROCESSING", "FAILED", "CANCELED", "EXPIRED"],
  PROCESSING: ["SUCCEEDED", "FAILED"],
  FAILED: ["CREATED", "CANCELED"],
  SUCCEEDED: [],
  CANCELED: [],
  EXPIRED: [],
};

export const PAYMENT_TRANSACTION_TRANSITIONS: Record<
  PaymentTransactionStatus,
  PaymentTransactionStatus[]
> = {
  PENDING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: [],
  FAILED: [],
};

export const REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  REQUESTED: ["PROCESSING", "CANCELED"],
  PROCESSING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: [],
  FAILED: [],
  CANCELED: [],
};

export const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: ["PROCESSING", "CANCELED"],
  PROCESSING: ["PAID", "FAILED"],
  FAILED: ["PROCESSING", "CANCELED"],
  PAID: ["REVERSED"],
  CANCELED: [],
  REVERSED: [],
};

function assertTransition<S extends string>(
  graph: Record<S, S[]>,
  entityLabel: string,
  current: S,
  next: S,
): void {
  if (!graph[current].includes(next)) {
    throw new ConflictError(`Cannot move ${entityLabel} from ${current} to ${next}.`);
  }
}

export function assertPaymentIntentTransition(
  current: PaymentIntentStatus,
  next: PaymentIntentStatus,
): void {
  assertTransition(PAYMENT_INTENT_TRANSITIONS, "a payment intent", current, next);
}

export function assertPaymentTransactionTransition(
  current: PaymentTransactionStatus,
  next: PaymentTransactionStatus,
): void {
  assertTransition(PAYMENT_TRANSACTION_TRANSITIONS, "a payment transaction", current, next);
}

export function assertRefundTransition(current: RefundStatus, next: RefundStatus): void {
  assertTransition(REFUND_TRANSITIONS, "a refund", current, next);
}

export function assertPayoutTransition(current: PayoutStatus, next: PayoutStatus): void {
  assertTransition(PAYOUT_TRANSITIONS, "a payout", current, next);
}
