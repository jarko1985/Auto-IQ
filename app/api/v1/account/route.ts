import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getMyAccount, listMyRecentActivity } from "@/features/account/service";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const [account, recentActivity] = await Promise.all([
      getMyAccount(user.id),
      listMyRecentActivity(user.id, 5),
    ]);
    return NextResponse.json({ data: { ...account, recentActivity } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
