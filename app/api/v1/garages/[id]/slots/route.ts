import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listSlotsSchema } from "@/features/bookings/schemas";
import { listAvailableSlots } from "@/features/bookings/service";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const parsed = listSlotsSchema.safeParse({
      locationId: searchParams.get("locationId") ?? undefined,
      date: searchParams.get("date") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid slot query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const slots = await listAvailableSlots(id, parsed.data);
    return NextResponse.json({ data: slots });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
