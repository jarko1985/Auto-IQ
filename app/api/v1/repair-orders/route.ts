import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listRepairOrdersSchema } from "@/features/repair-orders/schemas";
import { listMyRepairOrders } from "@/features/repair-orders/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.REPAIR_ORDER_READ_OWN);

    const { searchParams } = request.nextUrl;
    const parsed = listRepairOrdersSchema.safeParse({
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

    const { repairOrders, total } = await listMyRepairOrders(user.id, parsed.data);
    return NextResponse.json({
      data: repairOrders,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
