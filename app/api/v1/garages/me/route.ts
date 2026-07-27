import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { updateGarageProfileSchema } from "@/features/garages/schemas";
import { getMyGarageDashboard, updateGarageProfile } from "@/features/garages/service";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const dashboard = await getMyGarageDashboard(session.user.id);
    if (!dashboard) throw new NotFoundError("Garage organization");

    return NextResponse.json({ data: dashboard });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON.", requestId } },
        { status: 400 },
      );
    }

    const parsed = updateGarageProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid business profile data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const garage = await updateGarageProfile(session.user.id, parsed.data);
    return NextResponse.json({ data: garage });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
