import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { submitReviewSchema } from "@/features/repair-orders/schemas";
import { submitReview } from "@/features/repair-orders/service";
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
    const parsed = submitReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid rating is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const review = await submitReview(user.id, id, parsed.data);
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
