import { NextResponse } from "next/server";
import { getMakes } from "@/features/vehicles/service";

export const runtime = "nodejs";

export async function GET() {
  const makes = await getMakes();
  return NextResponse.json({ data: makes });
}
