import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { markAllNotificationsRead } from "@/features/notifications/service";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST() {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
