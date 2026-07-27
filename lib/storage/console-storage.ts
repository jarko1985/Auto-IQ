import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/observability/logger";
import type { StorageProvider, UploadResult } from "./types";

// Dev-only local filesystem root — never used in production (see lib/storage/index.ts).
const STORAGE_ROOT = path.join(process.cwd(), ".local-storage");

/** Resolves a storage key to an absolute path under STORAGE_ROOT, rejecting
 * any key that would escape it (defense in depth — keys are always
 * server-generated with randomUUID(), never taken directly from user input). */
function resolvePath(key: string): string {
  const resolved = path.join(STORAGE_ROOT, key);
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

/** Persists uploaded bytes to a local directory so development actually has
 * something to read back (e.g. for AI vision calls, thumbnail rendering).
 * Not for production use — swap for S3/Blob there (see lib/storage/index.ts). */
export class ConsoleStorageProvider implements StorageProvider {
  async upload(key: string, data: Buffer, mimeType: string): Promise<UploadResult> {
    const filePath = resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    const url = `/dev-storage/${key}`;
    logger.info({ key, mimeType, bytes: data.length }, "DEV storage upload (persisted to disk)");
    return { key, url };
  }

  async download(key: string): Promise<Buffer> {
    return readFile(resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    logger.info({ key }, "DEV storage delete");
  }

  getUrl(key: string): string {
    return `/dev-storage/${key}`;
  }
}
