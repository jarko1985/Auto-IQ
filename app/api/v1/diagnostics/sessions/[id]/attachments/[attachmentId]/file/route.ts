import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAttachmentFile } from "@/features/diagnostics/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { requirePermission } from "@/lib/api/require-permission";
import { errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

/** Authenticated byte-serving proxy — the client only ever sees this route's
 * opaque session/attachment ids, never the underlying storage key (rule #8). */
export async function GET(_request: NextRequest, { params }: Params) {
  const requestId = randomUUID();
  try {
    const user = await requirePermission(PERMISSIONS.DIAGNOSTIC_READ_OWN);
    const { id, attachmentId } = await params;
    const file = await getAttachmentFile(id, user.id, attachmentId);
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
