import { AppError } from "@/lib/errors";

export class UnsupportedDocumentTypeError extends AppError {
  constructor(mimeType: string) {
    super(`No text extractor is registered for "${mimeType}"`, "UNSUPPORTED_DOCUMENT_TYPE", 422);
    this.name = "UnsupportedDocumentTypeError";
  }
}
