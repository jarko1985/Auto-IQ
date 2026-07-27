import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { listGarageCalendar } from "@/features/bookings/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const calendarQuerySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD"),
});

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { searchParams } = request.nextUrl;
    const parsed = calendarQuerySchema.safeParse({
      weekStart: searchParams.get("weekStart") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid calendar query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const weekStart = new Date(`${parsed.data.weekStart}T00:00:00Z`);
    weekStart.setUTCHours(weekStart.getUTCHours() - 8); // GST-day safety margin
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    weekEnd.setUTCHours(weekEnd.getUTCHours() + 16);

    const bookings = await listGarageCalendar(session.user.id, weekStart, weekEnd);
    return NextResponse.json({ data: bookings });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
