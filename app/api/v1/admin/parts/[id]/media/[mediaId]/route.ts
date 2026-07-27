import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { deletePartMedia } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; mediaId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const { id, mediaId } = await params;
    await deletePartMedia(user.id, id, mediaId);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
