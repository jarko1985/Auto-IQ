import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { uploadDocumentSchema } from "@/features/vehicles/schemas";
import { uploadVehicleDocument } from "@/features/vehicles/service";
import { toApiError } from "@/lib/errors";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  const { id: vehicleId } = await params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required.", requestId } },
      { status: 401 },
    );
  }

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
          message: "Only images and PDFs are accepted.",
          requestId,
        },
      },
      { status: 422 },
    );
  }

  const docType = formData.get("type");
  const parsed = uploadDocumentSchema.safeParse({
    type: docType,
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await uploadVehicleDocument(session.user.id, vehicleId, buffer, parsed.data);
    return NextResponse.json({ data: { id: doc.id } }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error, requestId);
    const status = apiError.error.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(apiError, { status });
  }
}
