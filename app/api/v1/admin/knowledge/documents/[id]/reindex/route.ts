import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { reindexDocument } from "@/features/knowledge/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);
    const { id } = await params;
    const result = await reindexDocument(id, user.id);
    return NextResponse.json({ data: result.document, meta: { chunkCount: result.chunkCount } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
