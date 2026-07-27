import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { listGarageMechanics } from "@/features/repair-orders/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const mechanics = await listGarageMechanics(session.user.id);
    return NextResponse.json({ data: mechanics });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
