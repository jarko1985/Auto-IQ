import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rejectGarageSchema } from "@/features/garages/schemas";
import { rejectGarageApplication } from "@/features/garages/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_GARAGES_APPROVE);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON.", requestId } },
        { status: 400 },
      );
    }

    const parsed = rejectGarageSchema.safeParse(body);
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

    const { id } = await params;
    const garage = await rejectGarageApplication(id, user.id, parsed.data.reason);
    return NextResponse.json({ data: garage });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
