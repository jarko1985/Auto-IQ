import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getInvitationByToken } from "@/features/garages/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

// Public — an invitee needs to see who invited them and to which org before
// signing in or creating an account, so this intentionally requires no auth.
export async function GET(_request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);

    return NextResponse.json({
      data: {
        organizationName: invitation.organization.name,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        email: invitation.email,
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
