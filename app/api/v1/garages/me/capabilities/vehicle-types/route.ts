import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { updateVehicleCapabilitiesSchema } from "@/features/garages/schemas";
import { updateGarageVehicleCapabilities } from "@/features/garages/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
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

    const parsed = updateVehicleCapabilitiesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle capability data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const capabilities = await updateGarageVehicleCapabilities(session.user.id, parsed.data);
    return NextResponse.json({ data: capabilities });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
