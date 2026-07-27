import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getRecommendedGarages } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_READ_OWN);
    const { id } = await params;

    const { searchParams } = request.nextUrl;
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const lat = latParam != null ? Number(latParam) : undefined;
    const lng = lngParam != null ? Number(lngParam) : undefined;
    const geo =
      lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
        ? { lat, lng }
        : undefined;

    const result = await getRecommendedGarages(id, user.id, geo);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
