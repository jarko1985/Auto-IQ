import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createPartSchema, listAdminPartsSchema } from "@/features/catalog/schemas";
import { createPartByAdmin, listAdminParts } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);

    const { searchParams } = request.nextUrl;
    const parsed = listAdminPartsSchema.safeParse({
      approvalState: searchParams.get("approvalState") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      origin: searchParams.get("origin") ?? undefined,
      query: searchParams.get("query") ?? undefined,
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

    const { parts, total } = await listAdminParts(parsed.data);
    return NextResponse.json({
      data: parts,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);

    const body = await request.json();
    const parsed = createPartSchema.safeParse(body);
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

    const part = await createPartByAdmin(user.id, parsed.data);
    return NextResponse.json({ data: part }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
