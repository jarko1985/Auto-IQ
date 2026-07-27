import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPublicPartDetail } from "@/features/catalog/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const { id } = await params;
    const part = await getPublicPartDetail(id);
    return NextResponse.json({ data: part });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
