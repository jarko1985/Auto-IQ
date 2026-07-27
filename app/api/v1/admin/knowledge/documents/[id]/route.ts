import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDocument, archiveDocument } from "@/features/knowledge/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);
    const { id } = await params;
    const document = await getDocument(id);
    return NextResponse.json({ data: document });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);
    const { id } = await params;
    const document = await archiveDocument(id, user.id);
    return NextResponse.json({ data: document });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
