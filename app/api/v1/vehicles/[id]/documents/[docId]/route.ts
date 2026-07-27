import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteVehicleDocument } from "@/features/vehicles/service";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: vehicleId, docId } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    await deleteVehicleDocument(session.user.id, vehicleId, docId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const apiError = toApiError(error);
    const status =
      apiError.error.code === "NOT_FOUND" ? 404 : apiError.error.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(apiError, { status });
  }
}
