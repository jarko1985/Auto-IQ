import { NextRequest, NextResponse } from "next/server";
import { verifyOtpSchema } from "@/features/auth/schemas";
import { verifyOtp } from "@/features/auth/service";
import { toApiError } from "@/lib/errors";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON.", requestId } },
      { status: 400 },
    );
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input.",
          details: parsed.error.flatten().fieldErrors,
          requestId,
        },
      },
      { status: 422 },
    );
  }

  try {
    await verifyOtp(parsed.data.phone, parsed.data.token);
    return NextResponse.json({ data: { verified: true } });
  } catch (error) {
    const apiError = toApiError(error, requestId);
    return NextResponse.json(apiError, { status: 400 });
  }
}
