import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { listVendorStaff } from "@/features/vendors/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const staff = await listVendorStaff(session.user.id);
    return NextResponse.json({ data: staff });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
