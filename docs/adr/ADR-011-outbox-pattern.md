# ADR-011: Outbox Pattern for Reliable Events

**Status:** Accepted — the `WebhookEvent` half of this ADR was implemented in Sprint 12 (generic model, currently populated only by payments; see [ADR-013](./ADR-013-payment-architecture.md)). The `OutboxEvent` half remains unimplemented — no job runner exists yet, same gap documented since Sprint 8.
**Date:** 2026-07-17

## Context

Side effects (sending emails, SMS, push notifications, syncing inventory) must not be lost if the process crashes after a database write but before the side effect is dispatched. Two-phase commits across DB and message broker are operationally complex.

## Decision

Use the Transactional Outbox pattern: side effects are written to an `OutboxEvent` table in the same database transaction as the triggering business event. A background poller (or SQS on AWS) reads and dispatches unprocessed events with at-least-once delivery and idempotency keys.

## Consequences

- `OutboxEvent` table includes: `id`, `type`, `payload`, `status`, `processedAt`, `attempts`, `createdAt`.
- Idempotency key on each downstream call (email, SMS, notification) prevents duplicates on retry.
- Background job provider decision is deferred until Sprint 8; `OutboxEvent` polling works in the interim.
- On AWS migration, SQS replaces the poller — the outbox write pattern remains the same, the consumer changes.
- `WebhookEvent` table handles inbound webhooks (payment providers, etc.) with the same idempotency guarantee.
