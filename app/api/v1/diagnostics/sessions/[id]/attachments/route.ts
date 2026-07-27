import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { uploadAttachmentSchema } from "@/features/diagnostics/schemas";
import { uploadAttachment, listSessionAttachments } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Public shape — never includes storageKey (rule #8: no secrets in client code). */
function toPublicAttachment(attachment: {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}) {
  return {
    id: attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt,
  };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_READ_OWN);
    const { id } = await params;
    const attachments = await listSessionAttachments(id, user.id);
    return NextResponse.json({ data: attachments.map(toPublicAttachment) });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_CREATE);
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

    const parsed = uploadAttachmentSchema.safeParse({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Only JPEG/PNG/WebP photos or MP4/MOV videos up to 20MB are accepted.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await uploadAttachment(id, user.id, buffer, parsed.data);
    return NextResponse.json({ data: toPublicAttachment(attachment) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
