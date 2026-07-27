import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listFeedbackQueueSchema } from "@/features/diagnostics/schemas";
import { listDiagnosticFeedback } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_DIAGNOSTICS_MANAGE);

    const { searchParams } = request.nextUrl;
    const parsed = listFeedbackQueueSchema.safeParse({
      maxRating: searchParams.get("maxRating") ?? undefined,
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

    const { feedback, total } = await listDiagnosticFeedback(parsed.data);
    return NextResponse.json({
      data: feedback,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
