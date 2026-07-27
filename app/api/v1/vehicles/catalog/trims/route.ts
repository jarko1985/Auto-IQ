import { NextRequest, NextResponse } from "next/server";
import { getTrimsByModel } from "@/features/vehicles/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const modelId = request.nextUrl.searchParams.get("modelId");
  if (!modelId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "modelId query parameter is required." } },
      { status: 400 },
    );
  }

  const trims = await getTrimsByModel(modelId);
  return NextResponse.json({ data: trims });
}
