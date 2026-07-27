import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { createServiceHistorySchema } from "@/features/vehicles/schemas";
import { listServiceHistory, addServiceHistoryEntry } from "@/features/vehicles/service";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: vehicleId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    const history = await listServiceHistory(session.user.id, vehicleId);
    return NextResponse.json({ data: history });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(apiError, { status: apiError.error.code === "NOT_FOUND" ? 404 : 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  const { id: vehicleId } = await params;

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

  const parsed = createServiceHistorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid service history data.",
          details: parsed.error.flatten().fieldErrors,
          requestId,
        },
      },
      { status: 422 },
    );
  }

  try {
    const entry = await addServiceHistoryEntry(session.user.id, vehicleId, parsed.data);
    return NextResponse.json({ data: { id: entry.id } }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error, requestId);
    return NextResponse.json(apiError, { status: apiError.error.code === "NOT_FOUND" ? 404 : 500 });
  }
}
