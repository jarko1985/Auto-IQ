import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getOrCreateShareLink, revokeSessionShareLink } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_READ_OWN);
    const { id } = await params;
    const link = await getOrCreateShareLink(id, user.id);
    return NextResponse.json({ data: { token: link.token, expiresAt: link.expiresAt } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_READ_OWN);
    const { id } = await params;
    await revokeSessionShareLink(id, user.id);
    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
