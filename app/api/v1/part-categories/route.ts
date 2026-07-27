import { NextResponse } from "next/server";
import { listCategories } from "@/features/catalog/service";

export const runtime = "nodejs";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({ data: categories });
}
