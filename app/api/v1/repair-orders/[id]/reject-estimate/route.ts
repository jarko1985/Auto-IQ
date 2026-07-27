import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rejectEstimateSchema } from "@/features/repair-orders/schemas";
import { rejectEstimate } from "@/features/repair-orders/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.REPAIR_ORDER_READ_OWN);
    const { id } = await params;

    const body = await request.json();
    const parsed = rejectEstimateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A reason is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const repairOrder = await rejectEstimate(user.id, id, parsed.data);
    return NextResponse.json({ data: repairOrder });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
