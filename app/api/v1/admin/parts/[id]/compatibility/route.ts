import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createPartCompatibilitySchema } from "@/features/catalog/schemas";
import { addCompatibility } from "@/features/catalog/service";
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
    const parsed = createPartCompatibilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid compatibility rule.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const rule = await addCompatibility(user.id, id, parsed.data);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
