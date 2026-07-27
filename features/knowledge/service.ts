import { createHash } from "node:crypto";
import { getEmbeddingProvider } from "@/lib/ai/embeddings";
import { AIProviderError } from "@/lib/ai/errors";
import { AppError, ConflictError, NotFoundError, ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";
import { getStorageProvider } from "@/lib/storage";
import { extractText } from "@/lib/text-extraction";
import { chunkText } from "./chunking";
import { matchesKnowledgeFilters, type KnowledgeRetrievalFilters } from "./filters";
import * as repo from "./repository";
import type { ListKnowledgeDocumentsInput, UploadKnowledgeDocumentInput } from "./schemas";

const RETRIEVAL_CANDIDATE_MULTIPLIER = 4;
const RETRIEVAL_CANDIDATE_CAP = 40;

export async function uploadDocument(
  adminUserId: string,
  buffer: Buffer,
  input: UploadKnowledgeDocumentInput,
) {
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  const duplicate = await repo.findActiveDuplicateByHash(contentHash);
  if (duplicate) {
    throw new ConflictError(
      `Identical content already exists as document "${duplicate.title}" (${duplicate.id})`,
    );
  }

  let version = 1;
  if (input.previousVersionId) {
    const previous = await repo.getDocumentById(input.previousVersionId);
    if (!previous) throw new NotFoundError("Previous document version");
    version = previous.version + 1;
  }

  const storage = getStorageProvider();
  const storageKey = `knowledge/${contentHash}-${input.filename}`;
  await storage.upload(storageKey, buffer, input.mimeType);

  const document = await repo.createDocument({
    title: input.title,
    description: input.description,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl || undefined,
    documentType: input.documentType,
    makeName: input.makeName,
    modelName: input.modelName,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
    engineCode: input.engineCode,
    storageKey,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    contentHash,
    uploadedById: adminUserId,
    previousVersionId: input.previousVersionId,
    version,
  });

  await repo.createAuditLog({
    userId: adminUserId,
    action: "KNOWLEDGE_DOCUMENT_UPLOADED",
    resourceId: document.id,
    metadata: { title: document.title, documentType: document.documentType },
  });

  try {
    const text = await extractText(buffer, input.mimeType);
    const updated = await repo.updateExtraction(document.id, {
      extractedText: text,
      ingestionStatus: "EXTRACTED",
    });
    logger.info({ documentId: document.id, chars: text.length }, "knowledge document extracted");
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Text extraction failed";
    logger.warn(
      { documentId: document.id, error: message },
      "knowledge document extraction failed",
    );
    return repo.updateExtraction(document.id, {
      ingestionStatus: "FAILED",
      ingestionError: message,
    });
  }
}

/** Chunks and embeds a document's extracted text, replacing any previous index.
 * Distinct admin-triggered step from upload (see ADR-007) — safe to re-run after
 * chunking strategy or embedding model changes. */
export async function reindexDocument(documentId: string, adminUserId: string) {
  const document = await repo.getDocumentById(documentId);
  if (!document) throw new NotFoundError("Knowledge document");
  if (!document.extractedText) {
    throw new ConflictError("Document has no extracted text to index yet");
  }

  const chunks = chunkText(document.extractedText);
  if (chunks.length === 0) {
    throw new ConflictError("Document produced no chunks to index");
  }

  const embeddingProvider = getEmbeddingProvider();
  let vectors: number[][];
  try {
    vectors = await embeddingProvider.embed(chunks.map((c) => c.content));
  } catch (err) {
    const message = err instanceof AIProviderError ? err.message : "Embedding generation failed";
    await repo.markIndexingFailed(documentId, message);
    throw new ServiceUnavailableError(`Failed to index document: ${message}`);
  }

  if (vectors.length !== chunks.length) {
    const message = "Embedding provider returned a mismatched number of vectors";
    await repo.markIndexingFailed(documentId, message);
    throw new ServiceUnavailableError(message);
  }

  await repo.replaceChunks(
    documentId,
    chunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i]! })),
  );
  const updated = await repo.markIndexed(documentId);

  await repo.createAuditLog({
    userId: adminUserId,
    action: "KNOWLEDGE_DOCUMENT_REINDEXED",
    resourceId: documentId,
    metadata: { chunkCount: chunks.length },
  });

  logger.info({ documentId, chunkCount: chunks.length }, "knowledge document indexed");
  return { document: updated, chunkCount: chunks.length };
}

export async function approveDocument(documentId: string, adminUserId: string) {
  const document = await repo.getDocumentById(documentId);
  if (!document) throw new NotFoundError("Knowledge document");

  const updated = await repo.approveDocument(documentId, adminUserId);
  await repo.createAuditLog({
    userId: adminUserId,
    action: "KNOWLEDGE_DOCUMENT_APPROVED",
    resourceId: documentId,
  });
  return updated;
}

export async function rejectDocument(documentId: string, adminUserId: string, reason: string) {
  const document = await repo.getDocumentById(documentId);
  if (!document) throw new NotFoundError("Knowledge document");

  const updated = await repo.rejectDocument(documentId, reason);
  await repo.createAuditLog({
    userId: adminUserId,
    action: "KNOWLEDGE_DOCUMENT_REJECTED",
    resourceId: documentId,
    metadata: { reason },
  });
  return updated;
}

export async function archiveDocument(documentId: string, adminUserId: string) {
  const document = await repo.getDocumentById(documentId);
  if (!document) throw new NotFoundError("Knowledge document");

  const updated = await repo.archiveDocument(documentId);
  await repo.createAuditLog({
    userId: adminUserId,
    action: "KNOWLEDGE_DOCUMENT_ARCHIVED",
    resourceId: documentId,
  });
  return updated;
}

export async function listDocuments(input: ListKnowledgeDocumentsInput) {
  const { limit, offset, ...filters } = input;
  return repo.listDocuments(filters, { limit, offset });
}

export async function getDocument(documentId: string) {
  const document = await repo.getDocumentById(documentId);
  if (!document) throw new NotFoundError("Knowledge document");
  return document;
}

export interface DiagnosticCitation {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string | null;
  documentType: string;
}

/** Resolves the KnowledgeDocument rows behind a DiagnosticResult's
 * `knowledgeDocumentIds` (Sprint 6) for citation display (Sprint 18) — the
 * only reader of that column until now. */
export async function getCitationDocuments(documentIds: string[]): Promise<DiagnosticCitation[]> {
  return repo.getDocumentsByIds(documentIds);
}

export interface RetrievedKnowledgeChunk {
  citationId: string;
  documentId: string;
  documentTitle: string;
  sourceName: string;
  sourceUrl: string | null;
  documentType: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** Only approved, indexed knowledge ever reaches diagnostic prompts (rule: "Only
 * approved documents may be used for production answers"). Over-fetches by
 * similarity, then narrows with the vehicle/document-type filter in JS. */
export async function retrieveApprovedKnowledge(
  query: string,
  filters: KnowledgeRetrievalFilters,
  limit: number,
): Promise<RetrievedKnowledgeChunk[]> {
  const embeddingProvider = getEmbeddingProvider();
  const [queryVector] = await embeddingProvider.embed([query]);
  if (!queryVector) throw new AppError("Failed to embed query", "EMBEDDING_FAILED", 502);

  const candidateLimit = Math.min(limit * RETRIEVAL_CANDIDATE_MULTIPLIER, RETRIEVAL_CANDIDATE_CAP);
  const candidates = await repo.searchChunksBySimilarity(queryVector, candidateLimit);

  return candidates
    .filter((c) => matchesKnowledgeFilters(c, filters))
    .slice(0, limit)
    .map((c) => ({
      citationId: c.chunkId,
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      documentType: c.documentType,
      chunkIndex: c.chunkIndex,
      content: c.content,
      similarity: c.similarity,
    }));
}
