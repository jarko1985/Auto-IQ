import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { createInventoryItemSchema, listInventorySchema } from "@/features/inventory/schemas";
import { createInventoryItem, listInventory } from "@/features/inventory/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { searchParams } = request.nextUrl;
    const parsed = listInventorySchema.safeParse({
      locationId: searchParams.get("locationId") ?? undefined,
      stockStatus: searchParams.get("stockStatus") ?? undefined,
      query: searchParams.get("query") ?? undefined,
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

    const { items, total } = await listInventory(session.user.id, parsed.data);
    return NextResponse.json({
      data: items,
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
    const parsed = createInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid inventory item data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const item = await createInventoryItem(session.user.id, parsed.data);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
