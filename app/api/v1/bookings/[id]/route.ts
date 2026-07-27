import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getMyBookingDetail } from "@/features/bookings/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.BOOKING_READ_OWN);
    const { id } = await params;
    const booking = await getMyBookingDetail(user.id, id);
    return NextResponse.json({ data: booking });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
