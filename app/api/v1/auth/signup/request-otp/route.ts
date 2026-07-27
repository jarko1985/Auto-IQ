import { NextRequest, NextResponse } from "next/server";
import { requestSignupOtpSchema } from "@/features/auth/schemas";
import { startSignup } from "@/features/auth/service";
import { errorResponse } from "@/lib/api/response";
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

  const parsed = requestSignupOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email address.",
          details: parsed.error.flatten().fieldErrors,
          requestId,
        },
      },
      { status: 422 },
    );
  }

  try {
    await startSignup(parsed.data.email, request.headers.get("x-forwarded-for") ?? undefined);
    return NextResponse.json({ data: { sent: true } }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
