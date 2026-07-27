import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getMyRepairOrderDetail } from "@/features/repair-orders/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.REPAIR_ORDER_READ_OWN);
    const { id } = await params;
    const repairOrder = await getMyRepairOrderDetail(user.id, id);
    return NextResponse.json({ data: repairOrder });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
