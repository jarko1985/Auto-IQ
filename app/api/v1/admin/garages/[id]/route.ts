import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getGarageApplication } from "@/features/garages/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_GARAGES_APPROVE);

    const { id } = await params;
    const garage = await getGarageApplication(id);
    return NextResponse.json({ data: garage });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
