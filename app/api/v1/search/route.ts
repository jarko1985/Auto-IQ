import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { search } from "@/features/search/service";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const result = await search(user.id, user.role, query);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
