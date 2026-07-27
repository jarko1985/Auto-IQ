import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  uploadKnowledgeDocumentSchema,
  listKnowledgeDocumentsSchema,
} from "@/features/knowledge/schemas";
import { uploadDocument, listDocuments } from "@/features/knowledge/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = ["text/plain", "text/markdown", "application/pdf"];

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  try {
    await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);

    const { searchParams } = request.nextUrl;
    const parsed = listKnowledgeDocumentsSchema.safeParse({
      approvalState: searchParams.get("approvalState") ?? undefined,
      documentType: searchParams.get("documentType") ?? undefined,
      makeName: searchParams.get("makeName") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query.",
            details: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const { documents, total } = await listDocuments(parsed.data);
    return NextResponse.json({
      data: documents,
      meta: { total, limit: parsed.data.limit, offset: parsed.data.offset },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE);

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
            message: "Only text, markdown, and PDF files are accepted.",
            requestId,
          },
        },
        { status: 422 },
      );
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = uploadKnowledgeDocumentSchema.safeParse({
      title: raw.title,
      description: raw.description || undefined,
      sourceName: raw.sourceName,
      sourceUrl: raw.sourceUrl || undefined,
      documentType: raw.documentType,
      makeName: raw.makeName || undefined,
      modelName: raw.modelName || undefined,
      yearFrom: raw.yearFrom || undefined,
      yearTo: raw.yearTo || undefined,
      engineCode: raw.engineCode || undefined,
      previousVersionId: raw.previousVersionId || undefined,
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
    const document = await uploadDocument(user.id, buffer, parsed.data);
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
