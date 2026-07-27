import type { StorageProvider } from "./types";
import { ConsoleStorageProvider } from "./console-storage";

export type { StorageProvider, UploadResult } from "./types";

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;
  // TODO Sprint 5: swap for Vercel Blob / S3 based on STORAGE_PROVIDER env var
  _provider = new ConsoleStorageProvider();
  return _provider;
}
