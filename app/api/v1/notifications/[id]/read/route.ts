import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { markNotificationRead } from "@/features/notifications/service";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const { id } = await params;
    const notification = await markNotificationRead(user.id, id);
    return NextResponse.json({ data: notification });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
