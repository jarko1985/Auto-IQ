import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createInvoiceForVendorOrder } from "@/features/payments/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** VendorOrder's deferred checkout entry point (Sprint 8) — creates (or
 * returns the existing) Invoice for this order so the customer can proceed to
 * Checkout: Review & Pay. Does not itself create a PaymentIntent — see
 * POST /api/v1/invoices/[id]/payment-intents. */
export async function POST(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_READ_OWN);
    const { id } = await params;
    const invoice = await createInvoiceForVendorOrder(user.id, id);
    return NextResponse.json({ data: invoice });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
