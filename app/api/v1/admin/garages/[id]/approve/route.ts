import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { approveGarageApplication } from "@/features/garages/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_GARAGES_APPROVE);

    const { id } = await params;
    const garage = await approveGarageApplication(id, user.id);
    return NextResponse.json({ data: garage });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
