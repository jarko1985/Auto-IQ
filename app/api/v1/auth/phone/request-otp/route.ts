import { NextRequest, NextResponse } from "next/server";
import { requestOtpSchema } from "@/features/auth/schemas";
import { generateOtp } from "@/features/auth/service";
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

  const parsed = requestOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid phone number.",
          details: parsed.error.flatten().fieldErrors,
          requestId,
        },
      },
      { status: 422 },
    );
  }

  await generateOtp(parsed.data.phone);

  // Always return 200 to prevent phone enumeration
  return NextResponse.json({ data: { sent: true } });
}
