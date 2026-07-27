export interface UploadResult {
  key: string;
  url: string;
}

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<UploadResult>;
  /** Reads back the raw bytes previously stored under `key`. Server-side only —
   * never exposed directly to the client (see the diagnostics attachment file
   * route for the authenticated-proxy pattern). */
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
