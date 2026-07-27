import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import { ConsoleStorageProvider } from "@/lib/storage/console-storage";

const STORAGE_ROOT = path.join(process.cwd(), ".local-storage");

describe("ConsoleStorageProvider", () => {
  afterEach(async () => {
    await rm(STORAGE_ROOT, { recursive: true, force: true });
  });

  it("persists uploaded bytes and reads them back unchanged", async () => {
    const provider = new ConsoleStorageProvider();
    const data = Buffer.from("fake-jpeg-bytes");
    const key = `diagnostics/session-1/attachments/${crypto.randomUUID()}.jpg`;

    const result = await provider.upload(key, data, "image/jpeg");
    expect(result.key).toBe(key);

    const readBack = await provider.download(key);
    expect(readBack.equals(data)).toBe(true);
  });

  it("removes the file on delete so a subsequent download fails", async () => {
    const provider = new ConsoleStorageProvider();
    const key = `diagnostics/session-1/attachments/${crypto.randomUUID()}.jpg`;
    await provider.upload(key, Buffer.from("bytes"), "image/jpeg");

    await provider.delete(key);

    await expect(provider.download(key)).rejects.toThrow();
  });

  it("delete is idempotent for an already-missing key", async () => {
    const provider = new ConsoleStorageProvider();
    await expect(
      provider.delete(`diagnostics/${crypto.randomUUID()}/nope.jpg`),
    ).resolves.not.toThrow();
  });

  it("rejects a storage key that attempts to escape the storage root", async () => {
    const provider = new ConsoleStorageProvider();
    await expect(
      provider.upload("../../etc/passwd", Buffer.from("x"), "text/plain"),
    ).rejects.toThrow();
  });
});
