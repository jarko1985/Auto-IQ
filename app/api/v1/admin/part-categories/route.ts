import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createPartCategorySchema } from "@/features/catalog/schemas";
import { createCategory, listCategories } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const categories = await listCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);

    const body = await request.json();
    const parsed = createPartCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid category data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const category = await createCategory(parsed.data);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
