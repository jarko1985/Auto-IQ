import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { createVehicleSchema } from "@/features/vehicles/schemas";
import { listUserVehicles, createUserVehicle } from "@/features/vehicles/service";
import { toApiError } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  const vehicles = await listUserVehicles(session.user.id);
  return NextResponse.json({ data: vehicles });
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const reqLogger = logger.child({ requestId, path: "/api/v1/vehicles" });

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required.", requestId } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON.", requestId } },
      { status: 400 },
    );
  }

  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid vehicle data.",
          details: parsed.error.flatten().fieldErrors,
          requestId,
        },
      },
      { status: 422 },
    );
  }

  try {
    const vehicle = await createUserVehicle(session.user.id, parsed.data);
    reqLogger.info({ vehicleId: vehicle.id }, "Vehicle created");
    return NextResponse.json({ data: { id: vehicle.id } }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error, requestId);
    reqLogger.error({ code: apiError.error.code }, "Vehicle creation failed");
    return NextResponse.json(apiError, { status: 500 });
  }
}
