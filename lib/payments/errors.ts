import { AppError } from "@/lib/errors";
import type { PaymentProviderName } from "./types";

export class PaymentProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: PaymentProviderName,
    public readonly transient: boolean,
    details?: unknown,
  ) {
    super(message, "PAYMENT_PROVIDER_ERROR", 502, details);
    this.name = "PaymentProviderError";
  }
}

/** Webhook signature verification failed. Never transient/retryable, and the
 * payload must never be processed when this is thrown — reject with 400 so
 * the provider's retry logic doesn't treat the delivery as accepted. */
export class WebhookSignatureError extends PaymentProviderError {
  constructor(message: string, provider: PaymentProviderName, details?: unknown) {
    super(message, provider, false, details);
    this.name = "WebhookSignatureError";
  }
}

/** A client retried a mutating payment request under the same idempotency key
 * but with a different request body — a genuine conflict, not a safe replay.
 * See ADR-013's reconciliation plan. */
export class IdempotencyConflictError extends AppError {
  constructor(message = "This idempotency key was already used with a different request.") {
    super(message, "IDEMPOTENCY_CONFLICT", 409);
    this.name = "IdempotencyConflictError";
  }
}
