import { NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** Dev-only static file server for ConsoleStorageProvider's `/dev-storage/*`
 * URLs (see lib/storage/console-storage.ts) — production swaps the storage
 * provider for S3/Blob, whose getUrl() would return a real public/CDN URL
 * needing no such route. Read-only; the provider's own resolvePath() already
 * rejects any key that would escape .local-storage/. */
type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path: segments } = await params;
  const key = segments.join("/");

  try {
    const buffer = await getStorageProvider().download(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found" } }, { status: 404 });
  }
}
