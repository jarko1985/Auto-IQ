import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rejectPartSchema } from "@/features/catalog/schemas";
import { rejectPart } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const { id } = await params;

    const body = await request.json();
    const parsed = rejectPartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A rejection reason is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const part = await rejectPart(user.id, id, parsed.data.reason);
    return NextResponse.json({ data: part });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
