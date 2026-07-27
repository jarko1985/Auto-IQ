import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { getGarageServiceConfig } from "@/features/garages/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const config = await getGarageServiceConfig(session.user.id);
    return NextResponse.json({ data: config });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
