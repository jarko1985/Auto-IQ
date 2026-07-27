import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { uploadVendorDocumentSchema } from "@/features/vendors/schemas";
import { uploadVendorDocument } from "@/features/vendors/service";
import { UnauthorizedError } from "@/lib/errors";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

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
            message: "Only JPG, PNG, and PDF files are accepted.",
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const parsed = uploadVendorDocumentSchema.safeParse({
      type: formData.get("type"),
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid document data.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadVendorDocument(session.user.id, buffer, parsed.data);
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
