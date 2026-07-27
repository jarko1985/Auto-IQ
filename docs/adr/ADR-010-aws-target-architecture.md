# ADR-010: AWS Target Architecture

**Status:** Accepted (Implementation deferred to Phase 7 / Sprint 15+)  
**Date:** 2026-07-17

## Context

Vercel has limits (function duration, cold starts, egress cost at scale). A UAE commercial launch may require data residency in a specific region. AWS provides the control needed at scale.

## Decision

Target architecture (to be provisioned in Phase 7):

- **Compute:** ECS Fargate (Next.js in `standalone` output container)
- **Registry:** ECR
- **Load balancing:** Application Load Balancer + ACM certificate
- **Database:** RDS PostgreSQL Multi-AZ (same schema, zero code change)
- **Cache:** ElastiCache for Valkey (sessions, rate limiting)
- **Storage:** S3 + CloudFront
- **Queue:** SQS (background jobs replacing OutboxEvent polling)
- **CDN/WAF:** CloudFront + AWS WAF
- **Secrets:** Secrets Manager (replaces env vars in Fargate task definitions)
- **Observability:** CloudWatch + CloudTrail + GuardDuty
- **DNS:** Route 53

## Migration Path

1. Add `output: "standalone"` to next.config.ts
2. Add Dockerfile (Prompt 30)
3. Infrastructure as code (Terraform or CDK)
4. Blue/green deployment via ECS
5. Migrate data from Vercel-hosted DB to RDS
6. Smoke test, then cut DNS

## Consequences

- Application code must remain stateless (no in-process caching).
- All secrets loaded from environment — never hardcoded.
- SQS replaces the OutboxEvent table polling pattern for reliable async processing.
