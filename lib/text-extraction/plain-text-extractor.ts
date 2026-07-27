import type { TextExtractionProvider } from "./types";

const SUPPORTED_MIME_TYPES = ["text/plain", "text/markdown"];

/** Extracts text from plain-text and Markdown sources. PDFs and other binary
 * formats need a dedicated extractor plugged into the registry — not yet wired
 * in for MVP (see lib/text-extraction/index.ts). */
export class PlainTextExtractor implements TextExtractionProvider {
  supports(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.includes(mimeType);
  }

  async extract(data: Buffer, _mimeType: string): Promise<string> {
    return data.toString("utf-8");
  }
}
