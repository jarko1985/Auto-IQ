import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createPaymentIntentForInvoice } from "@/features/payments/service";
import { idempotencyKeyHeaderSchema } from "@/features/payments/schemas";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Creates (or, on a retried request, returns) a Stripe PaymentIntent for
 * this Invoice — the client_secret the Checkout screen's Stripe Payment
 * Element confirms against. Requires an Idempotency-Key header (ADR-013). */
export async function POST(request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.PAYMENT_READ_OWN);
    const { id } = await params;

    const idempotencyKeyHeader = request.headers.get("Idempotency-Key");
    const parsedKey = idempotencyKeyHeaderSchema.safeParse(idempotencyKeyHeader);
    if (!parsedKey.success) {
      throw new ValidationError("A valid Idempotency-Key header is required.");
    }

    const result = await createPaymentIntentForInvoice(
      { id: user.id, email: user.email ?? "" },
      id,
      parsedKey.data,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
