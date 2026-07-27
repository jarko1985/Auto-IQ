import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { analyzeSession } from "@/features/diagnostics/service";
import { analyzeSessionSchema } from "@/features/diagnostics/schemas";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_CREATE);
    const { id } = await params;

    // Body is optional — older/other callers that send nothing still default
    // to English, matching analyzeSession's own default parameter.
    const body = await request.json().catch(() => ({}));
    const parsed = analyzeSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten(),
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const result = await analyzeSession(id, user.id, parsed.data.locale);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
