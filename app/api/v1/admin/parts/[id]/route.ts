import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updatePartSchema } from "@/features/catalog/schemas";
import { getPartDetail, updatePart } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const { id } = await params;
    const part = await getPartDetail(id);
    return NextResponse.json({ data: part });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const { id } = await params;

    const body = await request.json();
    const parsed = updatePartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid part data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const part = await updatePart(user.id, id, parsed.data);
    return NextResponse.json({ data: part });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
