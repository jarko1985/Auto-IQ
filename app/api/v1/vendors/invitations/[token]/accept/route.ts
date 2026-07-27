import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { acceptVendorInvitation } from "@/features/vendors/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user?.email) throw new UnauthorizedError();

    const { token } = await params;
    const organization = await acceptVendorInvitation(token, session.user.id, session.user.email);
    return NextResponse.json({
      data: { organizationId: organization.id, organizationName: organization.name },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
