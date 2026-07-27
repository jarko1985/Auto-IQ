import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEmbed = vi.fn();
const mockUpload = vi.fn();
const mockExtractText = vi.fn();

vi.mock("@/features/knowledge/repository", () => ({
  findActiveDuplicateByHash: vi.fn(),
  getDocumentById: vi.fn(),
  getDocumentsByIds: vi.fn(),
  createDocument: vi.fn(),
  updateExtraction: vi.fn(),
  markIndexed: vi.fn(),
  markIndexingFailed: vi.fn(),
  approveDocument: vi.fn(),
  rejectDocument: vi.fn(),
  archiveDocument: vi.fn(),
  replaceChunks: vi.fn(),
  listDocuments: vi.fn(),
  searchChunksBySimilarity: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  getEmbeddingProvider: () => ({
    name: "openai",
    model: "test-model",
    dimensions: 2,
    embed: mockEmbed,
  }),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({ upload: mockUpload, delete: vi.fn(), getUrl: vi.fn() }),
}));

vi.mock("@/lib/text-extraction", () => ({
  extractText: (...args: unknown[]) => mockExtractText(...args),
}));

import * as repo from "@/features/knowledge/repository";
import {
  uploadDocument,
  reindexDocument,
  approveDocument,
  retrieveApprovedKnowledge,
  getCitationDocuments,
} from "@/features/knowledge/service";
import type { UploadKnowledgeDocumentInput } from "@/features/knowledge/schemas";

const baseUploadInput: UploadKnowledgeDocumentInput = {
  title: "P0300 Guide",
  sourceName: "OEM Manual",
  documentType: "REPAIR_GUIDE",
  filename: "guide.txt",
  mimeType: "text/plain",
  sizeBytes: 10,
};

describe("uploadDocument", () => {
  beforeEach(() => {
    vi.mocked(repo.findActiveDuplicateByHash).mockReset().mockResolvedValue(null);
    vi.mocked(repo.createDocument).mockReset();
    vi.mocked(repo.updateExtraction).mockReset();
    vi.mocked(repo.getDocumentById).mockReset();
    vi.mocked(repo.createAuditLog).mockReset();
    mockUpload.mockReset().mockResolvedValue({ key: "k", url: "u" });
    mockExtractText.mockReset();
  });

  it("throws ConflictError when identical content already exists", async () => {
    vi.mocked(repo.findActiveDuplicateByHash).mockResolvedValue({
      id: "existing-id",
      title: "Existing Doc",
    } as never);

    await expect(
      uploadDocument("admin-1", Buffer.from("content"), baseUploadInput),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(repo.createDocument).not.toHaveBeenCalled();
  });

  it("marks the document EXTRACTED when text extraction succeeds", async () => {
    vi.mocked(repo.createDocument).mockResolvedValue({
      id: "doc-1",
      title: baseUploadInput.title,
    } as never);
    mockExtractText.mockResolvedValue("Extracted body text");
    vi.mocked(repo.updateExtraction).mockResolvedValue({
      id: "doc-1",
      ingestionStatus: "EXTRACTED",
    } as never);

    await uploadDocument("admin-1", Buffer.from("content"), baseUploadInput);

    expect(repo.updateExtraction).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({
        ingestionStatus: "EXTRACTED",
        extractedText: "Extracted body text",
      }),
    );
  });

  it("marks the document FAILED (without throwing) when text extraction fails", async () => {
    vi.mocked(repo.createDocument).mockResolvedValue({
      id: "doc-1",
      title: baseUploadInput.title,
    } as never);
    mockExtractText.mockRejectedValue(new Error("Unsupported file"));
    vi.mocked(repo.updateExtraction).mockResolvedValue({
      id: "doc-1",
      ingestionStatus: "FAILED",
    } as never);

    const result = await uploadDocument("admin-1", Buffer.from("content"), baseUploadInput);

    expect(repo.updateExtraction).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ ingestionStatus: "FAILED", ingestionError: "Unsupported file" }),
    );
    expect(result).toEqual({ id: "doc-1", ingestionStatus: "FAILED" });
  });

  it("bumps the version and requires the previous version to exist", async () => {
    vi.mocked(repo.getDocumentById).mockResolvedValue(null);

    await expect(
      uploadDocument("admin-1", Buffer.from("content"), {
        ...baseUploadInput,
        previousVersionId: "missing-id",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("reindexDocument", () => {
  beforeEach(() => {
    vi.mocked(repo.getDocumentById).mockReset();
    vi.mocked(repo.replaceChunks).mockReset();
    vi.mocked(repo.markIndexed).mockReset();
    vi.mocked(repo.markIndexingFailed).mockReset();
    vi.mocked(repo.createAuditLog).mockReset();
    mockEmbed.mockReset();
  });

  it("throws NotFoundError when the document does not exist", async () => {
    vi.mocked(repo.getDocumentById).mockResolvedValue(null);
    await expect(reindexDocument("missing", "admin-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws ConflictError when there is no extracted text yet", async () => {
    vi.mocked(repo.getDocumentById).mockResolvedValue({
      id: "doc-1",
      extractedText: null,
    } as never);
    await expect(reindexDocument("doc-1", "admin-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("chunks, embeds, and replaces chunks on success", async () => {
    vi.mocked(repo.getDocumentById).mockResolvedValue({
      id: "doc-1",
      extractedText: "Short guide about oil changes.",
    } as never);
    mockEmbed.mockResolvedValue([[0.1, 0.2]]);
    vi.mocked(repo.markIndexed).mockResolvedValue({
      id: "doc-1",
      ingestionStatus: "INDEXED",
    } as never);

    const result = await reindexDocument("doc-1", "admin-1");

    expect(repo.replaceChunks).toHaveBeenCalledWith(
      "doc-1",
      expect.arrayContaining([expect.objectContaining({ embedding: [0.1, 0.2] })]),
    );
    expect(result.chunkCount).toBe(1);
  });

  it("marks indexing FAILED and throws when the embedding provider errors", async () => {
    vi.mocked(repo.getDocumentById).mockResolvedValue({
      id: "doc-1",
      extractedText: "Short guide about oil changes.",
    } as never);
    mockEmbed.mockRejectedValue(new Error("provider down"));

    await expect(reindexDocument("doc-1", "admin-1")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    expect(repo.markIndexingFailed).toHaveBeenCalledWith("doc-1", expect.any(String));
    expect(repo.replaceChunks).not.toHaveBeenCalled();
  });
});

describe("approveDocument", () => {
  it("throws NotFoundError when the document does not exist", async () => {
    vi.mocked(repo.getDocumentById).mockReset().mockResolvedValue(null);
    await expect(approveDocument("missing", "admin-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("retrieveApprovedKnowledge", () => {
  beforeEach(() => {
    mockEmbed.mockReset();
    vi.mocked(repo.searchChunksBySimilarity).mockReset();
  });

  it("filters out candidates that don't match the vehicle context and applies the limit", async () => {
    mockEmbed.mockResolvedValue([[0.1, 0.2]]);
    vi.mocked(repo.searchChunksBySimilarity).mockResolvedValue([
      {
        chunkId: "chunk-1",
        documentId: "doc-1",
        chunkIndex: 0,
        content: "Toyota-specific content",
        documentTitle: "Toyota Guide",
        sourceName: "OEM",
        sourceUrl: null,
        documentType: "REPAIR_GUIDE",
        makeName: "Toyota",
        modelName: null,
        yearFrom: null,
        yearTo: null,
        engineCode: null,
        similarity: 0.95,
      },
      {
        chunkId: "chunk-2",
        documentId: "doc-2",
        chunkIndex: 0,
        content: "Nissan-specific content",
        documentTitle: "Nissan Guide",
        sourceName: "OEM",
        sourceUrl: null,
        documentType: "REPAIR_GUIDE",
        makeName: "Nissan",
        modelName: null,
        yearFrom: null,
        yearTo: null,
        engineCode: null,
        similarity: 0.9,
      },
    ] as never);

    const results = await retrieveApprovedKnowledge("brake noise", { makeName: "Toyota" }, 5);

    expect(results).toHaveLength(1);
    expect(results[0]?.citationId).toBe("chunk-1");
  });
});

describe("getCitationDocuments", () => {
  beforeEach(() => {
    vi.mocked(repo.getDocumentsByIds).mockReset();
  });

  it("resolves DiagnosticResult.knowledgeDocumentIds to their KnowledgeDocument rows", async () => {
    vi.mocked(repo.getDocumentsByIds).mockResolvedValue([
      {
        id: "doc-1",
        title: "Toyota Brake Guide",
        sourceName: "OEM",
        sourceUrl: "https://example.com/guide",
        documentType: "REPAIR_GUIDE",
      },
    ] as never);

    const result = await getCitationDocuments(["doc-1"]);

    expect(repo.getDocumentsByIds).toHaveBeenCalledWith(["doc-1"]);
    expect(result).toEqual([
      {
        id: "doc-1",
        title: "Toyota Brake Guide",
        sourceName: "OEM",
        sourceUrl: "https://example.com/guide",
        documentType: "REPAIR_GUIDE",
      },
    ]);
  });

  it("passes an empty id list straight through without erroring", async () => {
    vi.mocked(repo.getDocumentsByIds).mockResolvedValue([]);

    const result = await getCitationDocuments([]);

    expect(result).toEqual([]);
  });
});
