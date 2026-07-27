import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { knowledgeSearchSchema } from "@/features/knowledge/schemas";
import { retrieveApprovedKnowledge } from "@/features/knowledge/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

/** Admin-only preview endpoint for validating retrieval quality. Diagnostic
 * sessions call retrieveApprovedKnowledge() directly (Sprint 6), not this route. */
export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON.", requestId } },
        { status: 400 },
      );
    }

    const parsed = knowledgeSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid search query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const { query, limit, ...filters } = parsed.data;
    const results = await retrieveApprovedKnowledge(query, filters, limit);
    return NextResponse.json({ data: results });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
