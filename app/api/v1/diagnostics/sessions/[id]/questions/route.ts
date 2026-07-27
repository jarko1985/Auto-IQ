import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { generateQuestionsRequestSchema } from "@/features/diagnostics/schemas";
import { generateSessionQuestions } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * Generates (or, on repeat calls, returns the already-generated) Step 4
 * question set for a session in a single batch AI call — replaces the
 * Sprint 15 candidate-ranking endpoint this route supersedes.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_CREATE);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = generateQuestionsRequestSchema.safeParse(body);
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

    const result = await generateSessionQuestions(id, user.id, parsed.data.locale);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
