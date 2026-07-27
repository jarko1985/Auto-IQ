import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { adjustStockSchema } from "@/features/inventory/schemas";
import { adjustStock } from "@/features/inventory/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json();
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid stock adjustment.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const item = await adjustStock(session.user.id, id, parsed.data);
    return NextResponse.json({ data: item });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
