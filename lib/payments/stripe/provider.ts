/**
 * Stripe adapter for the PaymentProvider interface (Sprint 13 / ADR-013).
 *
 * The `stripe` SDK is imported only in this file — same rule Sprint 4 set for
 * `lib/ai/providers/`. Test/sandbox mode only: PAYMENT_SECRET_KEY must be a
 * sk_test_... key (never sk_live_...), enforced by convention/docs, not code
 * (Stripe itself has no "test-mode-only" API restriction to check against).
 */
import Stripe from "stripe";
import { env } from "@/lib/env";
import { PaymentProviderError, WebhookSignatureError } from "../errors";
import type {
  CapturePaymentIntentInput,
  CreatePaymentIntentInput,
  CreateRefundInput,
  PaymentIntentResult,
  PaymentProvider,
  PaymentProviderIntentStatus,
  RefundResult,
  VerifiedWebhookEvent,
  WebhookVerificationInput,
} from "../types";

function isTransientStripeError(err: unknown): boolean {
  if (err instanceof Stripe.errors.StripeConnectionError) return true;
  if (err instanceof Stripe.errors.StripeAPIError) return true;
  if (err instanceof Stripe.errors.StripeRateLimitError) return true;
  return false;
}

function mapIntentStatus(status: Stripe.PaymentIntent.Status): PaymentProviderIntentStatus {
  switch (status) {
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_capture":
      return "requires_action";
    case "requires_action":
      return "requires_action";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "canceled";
    default:
      return "failed";
  }
}

export function createStripeProvider(): PaymentProvider {
  function client(): Stripe {
    if (!env.PAYMENT_SECRET_KEY) {
      throw new PaymentProviderError("PAYMENT_SECRET_KEY is not configured", "stripe", false);
    }
    return new Stripe(env.PAYMENT_SECRET_KEY);
  }

  return {
    name: "stripe",

    async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
      try {
        const intent = await client().paymentIntents.create(
          {
            amount: input.amountMinorUnits,
            currency: input.currency.toLowerCase(),
            description: input.description,
            receipt_email: input.customerEmail,
            metadata: input.metadata,
            automatic_payment_methods: { enabled: true },
          },
          { idempotencyKey: input.idempotencyKey },
        );

        if (!intent.client_secret) {
          throw new PaymentProviderError("Stripe did not return a client secret", "stripe", false);
        }

        return {
          providerIntentId: intent.id,
          status: mapIntentStatus(intent.status),
          clientSecret: intent.client_secret,
        };
      } catch (err) {
        if (err instanceof PaymentProviderError) throw err;
        if (err instanceof Stripe.errors.StripeError) {
          throw new PaymentProviderError(err.message, "stripe", isTransientStripeError(err), {
            type: err.type,
            code: err.code,
          });
        }
        throw new PaymentProviderError(
          err instanceof Error ? err.message : "Unknown Stripe error",
          "stripe",
          true,
        );
      }
    },

    async capturePaymentIntent(input: CapturePaymentIntentInput): Promise<PaymentIntentResult> {
      try {
        const intent = await client().paymentIntents.capture(input.providerIntentId, {
          amount_to_capture: input.amountMinorUnits,
        });

        return {
          providerIntentId: intent.id,
          status: mapIntentStatus(intent.status),
          clientSecret: intent.client_secret ?? "",
        };
      } catch (err) {
        if (err instanceof Stripe.errors.StripeError) {
          throw new PaymentProviderError(err.message, "stripe", isTransientStripeError(err), {
            type: err.type,
            code: err.code,
          });
        }
        throw new PaymentProviderError(
          err instanceof Error ? err.message : "Unknown Stripe error",
          "stripe",
          true,
        );
      }
    },

    async cancelPaymentIntent(providerIntentId: string): Promise<void> {
      try {
        await client().paymentIntents.cancel(providerIntentId);
      } catch (err) {
        if (err instanceof Stripe.errors.StripeError) {
          throw new PaymentProviderError(err.message, "stripe", isTransientStripeError(err), {
            type: err.type,
            code: err.code,
          });
        }
        throw new PaymentProviderError(
          err instanceof Error ? err.message : "Unknown Stripe error",
          "stripe",
          true,
        );
      }
    },

    async createRefund(input: CreateRefundInput): Promise<RefundResult> {
      try {
        const refund = await client().refunds.create(
          {
            charge: input.providerTransactionId,
            amount: input.amountMinorUnits,
            reason: mapRefundReason(input.reason),
          },
          { idempotencyKey: input.idempotencyKey },
        );

        return {
          providerRefundId: refund.id,
          status: mapRefundStatus(refund.status),
        };
      } catch (err) {
        if (err instanceof Stripe.errors.StripeError) {
          throw new PaymentProviderError(err.message, "stripe", isTransientStripeError(err), {
            type: err.type,
            code: err.code,
          });
        }
        throw new PaymentProviderError(
          err instanceof Error ? err.message : "Unknown Stripe error",
          "stripe",
          true,
        );
      }
    },

    verifyWebhookSignature(input: WebhookVerificationInput): VerifiedWebhookEvent {
      if (!env.PAYMENT_WEBHOOK_SECRET) {
        throw new WebhookSignatureError("PAYMENT_WEBHOOK_SECRET is not configured", "stripe");
      }

      let event: Stripe.Event;
      try {
        event = client().webhooks.constructEvent(
          input.rawBody,
          input.signatureHeader,
          env.PAYMENT_WEBHOOK_SECRET,
        );
      } catch (err) {
        throw new WebhookSignatureError(
          err instanceof Error ? err.message : "Stripe webhook signature verification failed",
          "stripe",
        );
      }

      const object = event.data.object as { id?: string };
      const relatedProviderIntentId =
        event.type.startsWith("payment_intent.") && typeof object.id === "string"
          ? object.id
          : event.type === "charge.refunded" || event.type === "charge.succeeded"
            ? extractPaymentIntentIdFromCharge(event.data.object as Stripe.Charge)
            : undefined;

      return {
        providerEventId: event.id,
        eventType: event.type,
        payload: event.data.object,
        relatedProviderIntentId,
      };
    },
  };
}

function extractPaymentIntentIdFromCharge(charge: Stripe.Charge): string | undefined {
  const pi = charge.payment_intent;
  if (!pi) return undefined;
  return typeof pi === "string" ? pi : pi.id;
}

function mapRefundReason(reason: string | undefined): Stripe.RefundCreateParams.Reason | undefined {
  if (reason === "duplicate" || reason === "fraudulent" || reason === "requested_by_customer") {
    return reason;
  }
  return undefined;
}

function mapRefundStatus(status: Stripe.Refund["status"]): RefundResult["status"] {
  switch (status) {
    case "succeeded":
      return "succeeded";
    case "failed":
    case "canceled":
      return "failed";
    default:
      return "processing";
  }
}
