import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getVendorApplication } from "@/features/vendors/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_VENDORS_APPROVE);

    const { id } = await params;
    const vendor = await getVendorApplication(id);
    return NextResponse.json({ data: vendor });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
