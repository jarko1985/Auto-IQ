import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { approveDocument } from "@/features/knowledge/service";
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
    const document = await approveDocument(id, user.id);
    return NextResponse.json({ data: document });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
