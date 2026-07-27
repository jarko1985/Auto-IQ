import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockDownload = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/features/diagnostics/repository", () => ({
  getSessionById: vi.fn(),
  createAttachment: vi.fn(),
  listAttachments: vi.fn(),
  findAttachmentById: vi.fn(),
  deleteAttachment: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({ upload: mockUpload, download: mockDownload, delete: mockDelete }),
}));

import * as repo from "@/features/diagnostics/repository";
import {
  uploadAttachment,
  listSessionAttachments,
  deleteAttachment,
  getAttachmentFile,
} from "@/features/diagnostics/service";

const openSession = { id: "session-1", status: "IN_PROGRESS" };
const closedSession = { id: "session-1", status: "COMPLETE" };

beforeEach(() => {
  vi.mocked(repo.getSessionById).mockReset();
  vi.mocked(repo.createAttachment).mockReset();
  vi.mocked(repo.listAttachments).mockReset();
  vi.mocked(repo.findAttachmentById).mockReset();
  vi.mocked(repo.deleteAttachment).mockReset();
  mockUpload.mockReset();
  mockDownload.mockReset();
  mockDelete.mockReset();
});

describe("uploadAttachment", () => {
  it("throws NotFoundError when the session isn't owned by the user", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(null);
    await expect(
      uploadAttachment("session-1", "user-1", Buffer.from("x"), {
        filename: "a.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws ConflictError when the session is already closed", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(closedSession as never);
    await expect(
      uploadAttachment("session-1", "user-1", Buffer.from("x"), {
        filename: "a.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("uploads bytes to storage and persists a DiagnosticAttachment row", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(openSession as never);
    vi.mocked(repo.createAttachment).mockResolvedValue({
      id: "att-1",
      sessionId: "session-1",
      filename: "a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
    } as never);

    const result = await uploadAttachment("session-1", "user-1", Buffer.from("bytes"), {
      filename: "a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1234,
    });

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^diagnostics\/session-1\/attachments\/.+\.jpg$/),
      Buffer.from("bytes"),
      "image/jpeg",
    );
    expect(repo.createAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "session-1", filename: "a.jpg", sizeBytes: 1234 }),
    );
    expect(result).toMatchObject({ id: "att-1" });
  });
});

describe("deleteAttachment", () => {
  it("throws NotFoundError when the attachment doesn't belong to the session", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(openSession as never);
    vi.mocked(repo.findAttachmentById).mockResolvedValue(null);
    await expect(deleteAttachment("session-1", "user-1", "att-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes the file from storage and the row", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(openSession as never);
    vi.mocked(repo.findAttachmentById).mockResolvedValue({
      id: "att-1",
      storageKey: "diagnostics/session-1/attachments/a.jpg",
    } as never);

    await deleteAttachment("session-1", "user-1", "att-1");

    expect(mockDelete).toHaveBeenCalledWith("diagnostics/session-1/attachments/a.jpg");
    expect(repo.deleteAttachment).toHaveBeenCalledWith("att-1");
  });
});

describe("listSessionAttachments", () => {
  it("throws NotFoundError when the session isn't owned by the user", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(null);
    await expect(listSessionAttachments("session-1", "user-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns the session's attachments", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(openSession as never);
    vi.mocked(repo.listAttachments).mockResolvedValue([{ id: "att-1" }] as never);
    const result = await listSessionAttachments("session-1", "user-1");
    expect(result).toEqual([{ id: "att-1" }]);
  });
});

describe("getAttachmentFile", () => {
  it("throws NotFoundError when the attachment doesn't exist for this session", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(openSession as never);
    vi.mocked(repo.findAttachmentById).mockResolvedValue(null);
    await expect(getAttachmentFile("session-1", "user-1", "att-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("downloads and returns the raw bytes with mimeType/filename, never the storage key", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(openSession as never);
    vi.mocked(repo.findAttachmentById).mockResolvedValue({
      id: "att-1",
      storageKey: "diagnostics/session-1/attachments/a.jpg",
      mimeType: "image/jpeg",
      filename: "a.jpg",
    } as never);
    mockDownload.mockResolvedValue(Buffer.from("raw-bytes"));

    const result = await getAttachmentFile("session-1", "user-1", "att-1");

    expect(result).toEqual({
      data: Buffer.from("raw-bytes"),
      mimeType: "image/jpeg",
      filename: "a.jpg",
    });
  });
});
