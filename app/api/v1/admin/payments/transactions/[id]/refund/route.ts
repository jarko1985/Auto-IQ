import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requestRefund } from "@/features/payments/service";
import { createRefundSchema } from "@/features/payments/schemas";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PAYMENTS_MANAGE);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = createRefundSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid refund request.", parsed.error.flatten().fieldErrors);
    }

    const transaction = await requestRefund(user.id, id, parsed.data);
    return NextResponse.json({ data: transaction });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
