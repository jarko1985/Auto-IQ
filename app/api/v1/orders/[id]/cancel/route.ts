import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { cancelVendorOrderSchema } from "@/features/vendor-orders/schemas";
import { cancelMyOrder } from "@/features/vendor-orders/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_READ_OWN);
    const { id } = await params;

    const body = await request.json();
    const parsed = cancelVendorOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A cancellation reason is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const order = await cancelMyOrder(user.id, id, parsed.data.reason);
    return NextResponse.json({ data: order });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
