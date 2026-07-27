import { Prisma } from "@prisma/client";
import type { AuditAction, KnowledgeApprovalState, KnowledgeDocumentType } from "@prisma/client";
import { db } from "@/lib/db";
import type { TextChunk } from "./chunking";
import { toVectorLiteral } from "./vector";

export interface CreateDocumentData {
  title: string;
  description?: string;
  sourceName: string;
  sourceUrl?: string;
  documentType: KnowledgeDocumentType;
  makeName?: string;
  modelName?: string;
  yearFrom?: number;
  yearTo?: number;
  engineCode?: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  uploadedById: string;
  previousVersionId?: string;
  version: number;
}

export async function createDocument(data: CreateDocumentData) {
  return db.knowledgeDocument.create({ data });
}

/** Finds a document with identical content that hasn't been rejected — used for
 * upload-time duplicate detection (see ADR-007). */
export async function findActiveDuplicateByHash(contentHash: string) {
  return db.knowledgeDocument.findFirst({
    where: { contentHash, deletedAt: null, approvalState: { not: "REJECTED" } },
  });
}

export async function getDocumentById(id: string) {
  return db.knowledgeDocument.findUnique({ where: { id } });
}

/** Looks up documents by id for citation display — no approvalState/deletedAt
 * filter, since a citation should still show what backed a past diagnosis even
 * if the document was later archived (audit trail, rule #7). */
export async function getDocumentsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.knowledgeDocument.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, sourceName: true, sourceUrl: true, documentType: true },
  });
}

export async function listDocuments(
  filters: {
    approvalState?: KnowledgeApprovalState;
    documentType?: KnowledgeDocumentType;
    makeName?: string;
  },
  pagination: { limit: number; offset: number },
) {
  const where: Prisma.KnowledgeDocumentWhereInput = {
    deletedAt: null,
    ...(filters.approvalState && { approvalState: filters.approvalState }),
    ...(filters.documentType && { documentType: filters.documentType }),
    ...(filters.makeName && { makeName: { equals: filters.makeName, mode: "insensitive" } }),
  };

  const [documents, total] = await Promise.all([
    db.knowledgeDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pagination.limit,
      skip: pagination.offset,
      include: { _count: { select: { chunks: true } } },
    }),
    db.knowledgeDocument.count({ where }),
  ]);

  return { documents, total };
}

export async function updateExtraction(
  id: string,
  data: {
    extractedText?: string;
    ingestionStatus: "EXTRACTED" | "FAILED";
    ingestionError?: string | null;
  },
) {
  return db.knowledgeDocument.update({
    where: { id },
    data: {
      extractedText: data.extractedText,
      ingestionStatus: data.ingestionStatus,
      ingestionError: data.ingestionError ?? null,
    },
  });
}

export async function markIndexed(id: string) {
  return db.knowledgeDocument.update({
    where: { id },
    data: { ingestionStatus: "INDEXED", ingestionError: null },
  });
}

export async function markIndexingFailed(id: string, error: string) {
  return db.knowledgeDocument.update({
    where: { id },
    data: { ingestionStatus: "FAILED", ingestionError: error },
  });
}

/** Approves a document and, if it supersedes an earlier version, archives that
 * previous version in the same transaction (see ADR-007: old stays live until vetted). */
export async function approveDocument(id: string, approvedById: string) {
  return db.$transaction(async (tx) => {
    const doc = await tx.knowledgeDocument.update({
      where: { id },
      data: {
        approvalState: "APPROVED",
        approvedById,
        approvedAt: new Date(),
        rejectedReason: null,
      },
    });

    if (doc.previousVersionId) {
      await tx.knowledgeDocument.update({
        where: { id: doc.previousVersionId },
        data: { approvalState: "ARCHIVED" },
      });
    }

    return doc;
  });
}

export async function rejectDocument(id: string, reason: string) {
  return db.knowledgeDocument.update({
    where: { id },
    data: {
      approvalState: "REJECTED",
      rejectedReason: reason,
      approvedById: null,
      approvedAt: null,
    },
  });
}

export async function archiveDocument(id: string) {
  return db.knowledgeDocument.update({
    where: { id },
    data: { deletedAt: new Date(), approvalState: "ARCHIVED" },
  });
}

/** Atomically replaces all chunks for a document — used by the (re-)index flow.
 * Embeddings are written via raw SQL since Prisma Client has no native pgvector type. */
export async function replaceChunks(
  documentId: string,
  chunks: Array<TextChunk & { embedding: number[] }>,
) {
  await db.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { documentId } });

    for (const chunk of chunks) {
      const vectorLiteral = toVectorLiteral(chunk.embedding);
      await tx.$executeRaw`
        INSERT INTO knowledge_chunks (id, "documentId", "chunkIndex", content, "tokenCount", embedding, "createdAt")
        VALUES (gen_random_uuid(), ${documentId}::uuid, ${chunk.index}, ${chunk.content}, ${chunk.tokenCount}, ${vectorLiteral}::vector, now())
      `;
    }
  });
}

export interface SimilarityCandidateRow {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  documentTitle: string;
  sourceName: string;
  sourceUrl: string | null;
  documentType: KnowledgeDocumentType;
  makeName: string | null;
  modelName: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engineCode: string | null;
  similarity: number;
}

/** Vector-similarity search over APPROVED, non-deleted documents. Returns the top
 * `candidateLimit` rows by cosine similarity — callers apply metadata filters on top. */
export async function searchChunksBySimilarity(
  queryVector: number[],
  candidateLimit: number,
): Promise<SimilarityCandidateRow[]> {
  const vectorLiteral = toVectorLiteral(queryVector);

  return db.$queryRaw<SimilarityCandidateRow[]>`
    SELECT
      c.id AS "chunkId",
      c."documentId" AS "documentId",
      c."chunkIndex" AS "chunkIndex",
      c.content AS "content",
      d.title AS "documentTitle",
      d."sourceName" AS "sourceName",
      d."sourceUrl" AS "sourceUrl",
      d."documentType" AS "documentType",
      d."makeName" AS "makeName",
      d."modelName" AS "modelName",
      d."yearFrom" AS "yearFrom",
      d."yearTo" AS "yearTo",
      d."engineCode" AS "engineCode",
      1 - (c.embedding <=> ${vectorLiteral}::vector) AS "similarity"
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c."documentId"
    WHERE d."approvalState" = 'APPROVED'
      AND d."deletedAt" IS NULL
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${candidateLimit}
  `;
}

export async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      resourceId: data.resourceId,
      metadata: data.metadata,
      user: { connect: { id: data.userId } },
    },
  });
}
