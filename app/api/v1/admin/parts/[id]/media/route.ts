import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { uploadPartMediaSchema } from "@/features/catalog/schemas";
import { uploadPartMedia } from "@/features/catalog/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_PARTS_MANAGE);
    const { id } = await params;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_FORM", message: "Expected multipart/form-data.", requestId } },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "MISSING_FILE", message: "A file field is required.", requestId } },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FILE_TYPE",
            message: "Only JPG, PNG, and WEBP images are accepted.",
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const parsed = uploadPartMediaSchema.safeParse({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid image data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await uploadPartMedia(user.id, id, buffer, parsed.data);
    return NextResponse.json({ data: media }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
