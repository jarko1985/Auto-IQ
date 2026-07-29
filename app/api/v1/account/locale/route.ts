import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updateMyLocale } from "@/features/account/service";
import { updateLocaleSchema } from "@/features/account/schemas";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();
    const body = (await request.json()) as unknown;
    const parsed = updateLocaleSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError("Invalid input", parsed.error.flatten());

    const result = await updateMyLocale(user.id, parsed.data.locale);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
