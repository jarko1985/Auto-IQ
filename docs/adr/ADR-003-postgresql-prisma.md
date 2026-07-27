# ADR-003: PostgreSQL and Prisma ORM

**Status:** Accepted  
**Date:** 2026-07-17

## Context

Need a relational database with strong ACID guarantees for financial, booking, and repair-order operations. Vector search is required for the RAG knowledge base (MVP).

## Decision

PostgreSQL 16 via Docker Compose locally; `pgvector/pgvector:pg16` image to include the vector extension from day one. Prisma 6 as the ORM. `DIRECT_URL` provided for migrations to bypass connection poolers.

## Alternatives

- **MySQL** — rejected: pgvector not available; weaker JSON support.
- **MongoDB** — rejected: no native ACID transactions across documents; financial records require relational integrity.
- **Drizzle ORM** — considered: excellent TypeScript ergonomics, but Prisma's migration system and ecosystem are more mature for a team handoff scenario.

## Consequences

- All monetary values stored as integer minor units (fils for AED) — never float.
- `gen_random_uuid()` used for UUID generation (built into PostgreSQL 16+, no extension needed).
- pgvector extension used for embeddings in Phase 2. If traffic justifies it post-AWS migration, evaluate OpenSearch.
- Migrations created with `prisma migrate dev`, applied in production with `prisma migrate deploy`.
- Never run `prisma db push` in production — migrations only.
