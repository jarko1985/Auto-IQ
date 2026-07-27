import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listVendorQueueSchema } from "@/features/vendors/schemas";
import { listVendorApplications } from "@/features/vendors/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_VENDORS_APPROVE);

    const { searchParams } = request.nextUrl;
    const parsed = listVendorQueueSchema.safeParse({
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

    const { vendors, total } = await listVendorApplications(parsed.data);
    return NextResponse.json({
      data: vendors,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
