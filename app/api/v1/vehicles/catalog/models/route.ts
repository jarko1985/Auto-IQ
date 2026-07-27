import { NextRequest, NextResponse } from "next/server";
import { getModelsByMake } from "@/features/vehicles/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const makeId = request.nextUrl.searchParams.get("makeId");
  if (!makeId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "makeId query parameter is required." } },
      { status: 400 },
    );
  }

  const models = await getModelsByMake(makeId);
  return NextResponse.json({ data: models });
}
