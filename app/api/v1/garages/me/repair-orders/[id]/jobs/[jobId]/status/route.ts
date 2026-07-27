import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { updateJobStatusSchema } from "@/features/repair-orders/schemas";
import { updateJobStatus } from "@/features/repair-orders/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; jobId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const { id, jobId } = await params;

    const body = await request.json();
    const parsed = updateJobStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid job status is required.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const repairOrder = await updateJobStatus(session.user.id, id, jobId, parsed.data);
    return NextResponse.json({ data: repairOrder });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
