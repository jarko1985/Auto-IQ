export interface TextExtractionProvider {
  /** Whether this provider can handle the given MIME type. */
  supports(mimeType: string): boolean;
  extract(data: Buffer, mimeType: string): Promise<string>;
}
