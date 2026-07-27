import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { resetPassword } from "@/features/auth/service";
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

  const parsed = resetPasswordSchema.safeParse(body);
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
    await resetPassword(
      parsed.data.token,
      parsed.data.password,
      request.headers.get("x-forwarded-for") ?? undefined,
    );
    return NextResponse.json({ data: { reset: true } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
