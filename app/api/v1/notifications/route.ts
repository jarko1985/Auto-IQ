import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listMyNotifications } from "@/features/notifications/service";
import { listNotificationsSchema } from "@/features/notifications/schemas";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const parsed = listNotificationsSchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) throw new ValidationError("Invalid query", parsed.error.flatten());

    const { notifications, total, unreadCount } = await listMyNotifications(user.id, parsed.data);
    return NextResponse.json({
      data: notifications,
      meta: { total, unreadCount, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
