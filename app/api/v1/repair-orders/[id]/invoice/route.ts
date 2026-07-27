import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getMyInvoiceByPayable } from "@/features/payments/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** The Invoice finalizeInvoice() (garage-side, COMPLETED -> INVOICED)
 * creates for this repair order — the customer-facing "Download Invoice" /
 * pay entry point RepairOrder's own detail page links to. */
export async function GET(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.REPAIR_ORDER_READ_OWN);
    const { id } = await params;
    const invoice = await getMyInvoiceByPayable(user.id, "REPAIR_ORDER", id);
    return NextResponse.json({ data: invoice });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
