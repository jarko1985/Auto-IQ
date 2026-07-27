import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { listBookingsSchema } from "@/features/bookings/schemas";
import { listGarageBookings } from "@/features/bookings/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

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

    const { bookings, total } = await listGarageBookings(session.user.id, parsed.data);
    return NextResponse.json({
      data: bookings,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
