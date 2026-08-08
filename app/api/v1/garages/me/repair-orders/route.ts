import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { createRepairOrderSchema, listRepairOrdersSchema } from "@/features/repair-orders/schemas";
import {
  createRepairOrderFromBooking,
  listGarageRepairOrders,
} from "@/features/repair-orders/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { searchParams } = request.nextUrl;
    const parsed = listRepairOrdersSchema.safeParse({
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

    const { repairOrders, total } = await listGarageRepairOrders(session.user.id, parsed.data);
    return NextResponse.json({
      data: repairOrders,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = createRepairOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A bookingId is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const repairOrder = await createRepairOrderFromBooking(session.user.id, parsed.data.bookingId);
    return NextResponse.json({ data: repairOrder }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
