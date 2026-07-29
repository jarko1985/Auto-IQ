import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { changeMyPassword } from "@/features/account/service";
import { changePasswordSchema } from "@/features/account/schemas";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as unknown;
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    await changeMyPassword(user.id, parsed.data);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
