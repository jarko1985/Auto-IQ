import { UnsupportedDocumentTypeError } from "./errors";
import { PlainTextExtractor } from "./plain-text-extractor";
import type { TextExtractionProvider } from "./types";

export type { TextExtractionProvider } from "./types";
export { UnsupportedDocumentTypeError } from "./errors";

const registry: TextExtractionProvider[] = [new PlainTextExtractor()];

/** Extracts text using the first registered provider that supports the MIME type.
 * Throws UnsupportedDocumentTypeError if none match — the boundary new extractors
 * (e.g. PDF, DOCX) get registered against. */
export async function extractText(data: Buffer, mimeType: string): Promise<string> {
  const provider = registry.find((p) => p.supports(mimeType));
  if (!provider) throw new UnsupportedDocumentTypeError(mimeType);
  return provider.extract(data, mimeType);
}
