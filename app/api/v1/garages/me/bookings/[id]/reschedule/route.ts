import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { proposeRescheduleSchema } from "@/features/bookings/schemas";
import { proposeReschedule } from "@/features/bookings/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json();
    const parsed = proposeRescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid reschedule proposal.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const booking = await proposeReschedule(session.user.id, id, parsed.data);
    return NextResponse.json({ data: booking });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
