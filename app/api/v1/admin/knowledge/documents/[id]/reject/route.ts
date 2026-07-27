import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { rejectKnowledgeDocumentSchema } from "@/features/knowledge/schemas";
import { rejectDocument } from "@/features/knowledge/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON.", requestId } },
        { status: 400 },
      );
    }

    const parsed = rejectKnowledgeDocumentSchema.safeParse(body);
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

    const document = await rejectDocument(id, user.id, parsed.data.reason);
    return NextResponse.json({ data: document });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
