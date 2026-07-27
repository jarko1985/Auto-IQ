import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getMyPreferences, updateMyPreferences } from "@/features/notifications/service";
import { updatePreferencesSchema } from "@/features/notifications/schemas";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const preferences = await getMyPreferences(user.id);
    return NextResponse.json({ data: preferences });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as unknown;
    const parsed = updatePreferencesSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const preferences = await updateMyPreferences(user.id, parsed.data);
    return NextResponse.json({ data: preferences });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
