import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { submitVendorForReview } from "@/features/vendors/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST() {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const vendor = await submitVendorForReview(session.user.id);
    return NextResponse.json({ data: vendor });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
