# ADR-009: Vercel-First Deployment

**Status:** Accepted  
**Date:** 2026-07-17

## Context

Team needs fast deployment iteration without DevOps overhead during MVP. AWS is the long-term target (Phase 7) but requires significant infrastructure setup.

## Decision

Deploy to Vercel for Sprints 0–14. PostgreSQL hosted externally (Neon, Supabase, or managed instance). All code written stateless and environment-variable-driven so it deploys identically to Docker/AWS.

## Constraints

- No Vercel-specific APIs in application code (e.g., `@vercel/kv`, `@vercel/postgres` direct) — use provider abstractions.
- Storage: `StorageProvider` interface; Vercel Blob as MVP implementation, S3 as AWS implementation.
- Background jobs: `OutboxEvent` table pattern for reliable event dispatch; job runner selected before Sprint 8 (Phase 3).
- Secrets via Vercel environment variables for MVP; Secrets Manager for AWS.

## Consequences

- `next.config.ts` will gain `output: "standalone"` in the AWS migration sprint (ADR-010).
- Dockerfile added in the Docker/AWS readiness sprint per Prompt 30 in auto_iq.md (originally Prompt 24, renumbered to 29 when Prompts 21–25 were inserted ahead of it for the AI-enhancement roadmap, then to 30 when Prompt 26 — AI-Generated Diagnostic Questions — was inserted ahead of it too).
- Preview deployments on every PR via Vercel integration.
