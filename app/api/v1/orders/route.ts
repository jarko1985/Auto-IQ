import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createVendorOrderSchema, listVendorOrdersSchema } from "@/features/vendor-orders/schemas";
import { listMyOrders, placeOrder } from "@/features/vendor-orders/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_READ_OWN);

    const { searchParams } = request.nextUrl;
    const parsed = listVendorOrdersSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const { orders, total } = await listMyOrders(user.id, parsed.data);
    return NextResponse.json({
      data: orders,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ORDER_CREATE);

    const body = await request.json();
    const parsed = createVendorOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid order data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const order = await placeOrder(user.id, parsed.data);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
