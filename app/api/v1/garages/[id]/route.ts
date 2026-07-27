import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getGarageProfile } from "@/features/bookings/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const { id } = await params;
    const garage = await getGarageProfile(id);
    return NextResponse.json({ data: garage });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
