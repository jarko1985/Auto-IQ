# ADR-007: pgvector for MVP RAG

**Status:** Accepted  
**Date:** 2026-07-17

## Context

The diagnostic AI needs to retrieve relevant approved automotive knowledge (repair guides, service bulletins, fault codes) for each diagnostic session. A dedicated vector database adds operational complexity.

## Decision

Use pgvector extension in the existing PostgreSQL instance for MVP. `KnowledgeDocument` → `KnowledgeChunk` → embedding stored in a `vector` column. Similarity search via `<=>` (cosine distance) operator.

## Alternatives

- **Pinecone / Qdrant** — rejected for MVP: adds a managed service, cost, and operational surface. Evaluate post-AWS migration if pgvector latency or recall is insufficient.
- **OpenSearch vector engine** — listed in auto_iq.md §4 as post-AWS option. Will evaluate when traffic justifies dedicated search infrastructure.

## Consequences

- Documents must be explicitly approved (`approvalState = APPROVED`) before entering the retrieval index.
- Each retrieval includes source document IDs (`knowledgeDocumentIds`) stored in the AI result for auditability.
- Re-indexing is an admin-triggered operation, not automatic on document upload.
- Duplicate detection required before indexing to prevent inflated retrieval results.
- Metadata filters (make, model, year range, engine, document type) narrow retrieval before vector similarity.
