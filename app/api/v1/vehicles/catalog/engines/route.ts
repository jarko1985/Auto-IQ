import { NextRequest, NextResponse } from "next/server";
import { getEnginesByTrim } from "@/features/vehicles/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const trimId = request.nextUrl.searchParams.get("trimId");
  if (!trimId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "trimId query parameter is required." } },
      { status: 400 },
    );
  }

  const engines = await getEnginesByTrim(trimId);
  return NextResponse.json({ data: engines });
}
