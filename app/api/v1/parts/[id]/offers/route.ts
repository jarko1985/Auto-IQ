import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPublicPartDetail } from "@/features/catalog/service";
import { listOffersForPart } from "@/features/inventory/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const { id } = await params;
    await getPublicPartDetail(id); // 404s if the part doesn't exist or isn't approved
    const offers = await listOffersForPart(id);
    return NextResponse.json({ data: offers });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
