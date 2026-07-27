import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { requestPasswordReset } from "@/features/auth/service";
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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid email.", requestId } },
      { status: 422 },
    );
  }

  await requestPasswordReset(
    parsed.data.email,
    request.headers.get("x-forwarded-for") ?? undefined,
  );

  // Always 200 — prevents email enumeration
  return NextResponse.json({ data: { sent: true } });
}
