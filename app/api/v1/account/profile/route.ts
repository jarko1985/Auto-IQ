import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updateMyProfile } from "@/features/account/service";
import { updateProfileSchema } from "@/features/account/schemas";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as unknown;
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const profile = await updateMyProfile(user.id, parsed.data);
    return NextResponse.json({ data: profile });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
