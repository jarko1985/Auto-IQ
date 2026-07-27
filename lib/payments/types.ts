/**
 * Payment provider abstraction — interface only (Sprint 12 / ADR-013).
 *
 * No gateway SDK is imported here or anywhere outside `lib/payments/{provider}/`
 * once that adapter exists (Prompt 19 / Sprint 13) — same rule Sprint 4 set for
 * `lib/ai/providers/`. This file stays domain-agnostic: it knows nothing about
 * Invoice, VendorOrder, or RepairOrder, and returns its own minimal status
 * vocabulary rather than the Prisma PaymentIntentStatus/RefundStatus enums —
 * the features/payments/ service layer (not yet written) is what maps a
 * PaymentProvider result onto our own state machine
 * (features/payments/state-machines.ts), the same way features/ai/ maps an
 * AICallResult onto DiagnosticResult rather than lib/ai/ knowing about
 * diagnostics.
 *
 * Selected via `PAYMENT_PROVIDER` env var once an adapter is implemented,
 * mirroring `AI_PRIMARY_PROVIDER` (see docs/adr/ADR-013-payment-architecture.md).
 */

export type PaymentProviderName =
  "stripe" | "checkout_com" | "network_international" | "amazon_payment_services";

/** Provider-reported outcome of a single intent. A deliberate subset of our
 * own PaymentIntentStatus — the service layer is responsible for mapping this
 * onto the full state machine and asserting the transition is legal; it is
 * never written to the DB as-is. */
export type PaymentProviderIntentStatus =
  "requires_action" | "processing" | "succeeded" | "failed" | "canceled";

export interface CreatePaymentIntentInput {
  /**
   * Passed through to the gateway's own idempotency mechanism where one
   * exists (e.g. Stripe's `Idempotency-Key` header). The caller persists an
   * IdempotencyKey row under the same key — see ADR-013's reconciliation plan.
   */
  idempotencyKey: string;
  /** Always server-computed — never accept this from the client. Rule 4/Prompt 19. */
  amountMinorUnits: number;
  currency: string;
  description: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  providerIntentId: string;
  status: PaymentProviderIntentStatus;
  /**
   * Opaque token for hosted or provider-secure client-side collection
   * (e.g. Stripe's PaymentIntent client secret backing Payment Element).
   * Never a card number, CVV, or other cardholder data — see ADR-013's PCI
   * boundary. Nothing in this codebase may ever construct this value from
   * raw card fields.
   */
  clientSecret: string;
}

export interface CapturePaymentIntentInput {
  providerIntentId: string;
  /** Omit to capture the full authorized amount. */
  amountMinorUnits?: number;
}

export interface CreateRefundInput {
  /** The gateway's own charge/transaction id being refunded — corresponds to
   * PaymentTransaction.providerTransactionId, not our internal UUID. */
  providerTransactionId: string;
  amountMinorUnits: number;
  currency: string;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: "processing" | "succeeded" | "failed";
}

/** Raw inbound webhook request, before signature verification. */
export interface WebhookVerificationInput {
  rawBody: string;
  signatureHeader: string;
}

/**
 * A verified, provider-parsed webhook event, ready for idempotent processing.
 * The caller upserts a WebhookEvent row keyed on (provider, providerEventId)
 * — a duplicate delivery hits the unique constraint and is treated as already
 * processed, never re-applied.
 */
export interface VerifiedWebhookEvent {
  providerEventId: string;
  /** Raw gateway vocabulary (e.g. "payment_intent.succeeded") — intentionally
   * not narrowed to a union, so a new event type from the gateway never
   * requires a type change here; unrecognized types are stored and marked
   * IGNORED rather than rejected. */
  eventType: string;
  payload: unknown;
  relatedProviderIntentId?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;

  capturePaymentIntent(input: CapturePaymentIntentInput): Promise<PaymentIntentResult>;

  cancelPaymentIntent(providerIntentId: string): Promise<void>;

  createRefund(input: CreateRefundInput): Promise<RefundResult>;

  /**
   * Verifies the provider's webhook signature and parses the payload. Must
   * throw `WebhookSignatureError` (lib/payments/errors.ts) on a bad or
   * missing signature rather than returning an unverified event — callers
   * must never process a payload this method didn't return successfully.
   */
  verifyWebhookSignature(input: WebhookVerificationInput): VerifiedWebhookEvent;
}
