import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { submitFeedbackSchema } from "@/features/diagnostics/schemas";
import { submitFeedback } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_CREATE);
    const { id } = await params;
    const body = (await request.json()) as unknown;
    const parsed = submitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid feedback input", parsed.error.flatten());
    }
    const feedback = await submitFeedback(id, user.id, parsed.data);
    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
