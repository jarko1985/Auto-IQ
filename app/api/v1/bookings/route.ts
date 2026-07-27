import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createBookingSchema, listBookingsSchema } from "@/features/bookings/schemas";
import { createBooking, listMyBookings } from "@/features/bookings/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.BOOKING_READ_OWN);

    const { searchParams } = request.nextUrl;
    const parsed = listBookingsSchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const { bookings, total } = await listMyBookings(user.id, parsed.data);
    return NextResponse.json({
      data: bookings,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.BOOKING_CREATE);

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid booking data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const booking = await createBooking(user.id, parsed.data);
    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
