-- Prisma's schema DSL can't express pgvector index access methods, so this
-- runs separately after `db:push` / `db:migrate:deploy`. Safe to re-run.
-- npm run db:vector-index
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
