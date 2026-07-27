import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { processStripeWebhook } from "@/features/payments/service";
import { WebhookSignatureError } from "@/lib/payments/errors";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

/**
 * Stripe webhook receiver — signature-verified, idempotent (ADR-013).
 * Never parses `request.json()`: the raw body text is what
 * `verifyWebhookSignature()` needs to check against Stripe-Signature.
 */
export async function POST(request: Request) {
  const requestId = randomUUID();
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature") ?? "";

  try {
    const result = await processStripeWebhook(rawBody, signatureHeader);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      logger.warn({ requestId, error: error.message }, "stripe_webhook_signature_invalid");
      return NextResponse.json(
        { error: { code: error.code, message: error.message, requestId } },
        { status: 400 },
      );
    }
    logger.error({ requestId, error }, "stripe_webhook_processing_failed");
    // Non-2xx so Stripe retries the delivery — the (provider, providerEventId)
    // unique constraint makes a retried delivery safe to reprocess.
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_PROCESSING_FAILED",
          message: "Webhook processing failed",
          requestId,
        },
      },
      { status: 500 },
    );
  }
}
