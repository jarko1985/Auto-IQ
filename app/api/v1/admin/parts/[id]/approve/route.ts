import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { approvePart } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const { id } = await params;
    const part = await approvePart(user.id, id);
    return NextResponse.json({ data: part });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
