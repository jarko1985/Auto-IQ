import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updateMyAvatar } from "@/features/account/service";
import { uploadAvatarSchema } from "@/features/account/schemas";
import { requireAuthenticatedUser } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requireAuthenticatedUser();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ValidationError("Expected multipart/form-data.");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("A file field is required.");

    const parsed = uploadAvatarSchema.safeParse({ mimeType: file.type, sizeBytes: file.size });
    if (!parsed.success) throw new ValidationError("Invalid image", parsed.error.flatten());

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await updateMyAvatar(user.id, buffer, parsed.data);
    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
