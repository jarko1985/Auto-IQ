import { NextRequest, NextResponse } from "next/server";
import { completeSignupSchema } from "@/features/auth/schemas";
import { completeSignup } from "@/features/auth/service";
import { errorResponse } from "@/lib/api/response";
import { logger } from "@/lib/observability/logger";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const reqLogger = logger.child({ requestId, path: "/api/v1/auth/signup/complete" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON.", requestId } },
      { status: 400 },
    );
  }

  const parsed = completeSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request contains invalid data.",
          details: parsed.error.flatten().fieldErrors,
          requestId,
        },
      },
      { status: 422 },
    );
  }

  try {
    const user = await completeSignup(
      parsed.data,
      request.headers.get("x-forwarded-for") ?? undefined,
    );
    reqLogger.info({ userId: user.id }, "User registered via email OTP");
    return NextResponse.json({ data: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
