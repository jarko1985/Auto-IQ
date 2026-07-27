import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { recordDiagnosisSchema } from "@/features/repair-orders/schemas";
import { recordDiagnosis } from "@/features/repair-orders/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const { id } = await params;

    const body = await request.json();
    const parsed = recordDiagnosisSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A confirmed diagnosis is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const repairOrder = await recordDiagnosis(session.user.id, id, parsed.data);
    return NextResponse.json({ data: repairOrder });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
