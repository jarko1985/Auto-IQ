import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { updateVehicleSchema } from "@/features/vehicles/schemas";
import { getUserVehicle, updateUserVehicle, deleteUserVehicle } from "@/features/vehicles/service";
import { toApiError } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    const vehicle = await getUserVehicle(session.user.id, id);
    return NextResponse.json({ data: vehicle });
  } catch (error) {
    const apiError = toApiError(error);
    const status = apiError.error.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(apiError, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  const { id } = await params;
  const reqLogger = logger.child({ requestId, vehicleId: id });

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

  const parsed = updateVehicleSchema.safeParse(body);
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
    const vehicle = await updateUserVehicle(session.user.id, id, parsed.data);
    reqLogger.info("Vehicle updated");
    return NextResponse.json({ data: { id: vehicle.id } });
  } catch (error) {
    const apiError = toApiError(error, requestId);
    const status = apiError.error.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(apiError, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required.", requestId } },
      { status: 401 },
    );
  }

  try {
    await deleteUserVehicle(session.user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const apiError = toApiError(error, requestId);
    const status = apiError.error.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(apiError, { status });
  }
}
