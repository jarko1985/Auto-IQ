# ADR-001: Modular Monolith for MVP

**Status:** Accepted  
**Date:** 2026-07-17

## Context

AutoIQ UAE is a new product. Engineering velocity, operational simplicity, and a clean path to later service extraction are all required. The team is small.

## Decision

Build as a single Next.js application with explicit domain boundaries (`features/` directory). Each domain owns its service layer, repository, and authorization rules, but all domains share one process and one database.

## Alternatives

- **Microservices from day one** — rejected: operational overhead is too high, cross-service transactions are complex, and there is no concrete team size or traffic requirement justifying it.
- **Single-layer monolith** — rejected: violates the domain separation required for safe future extraction.

## Consequences

- Faster initial development and simpler deployment.
- Cross-domain calls are ordinary function calls — no network overhead.
- Feature flags gate in-progress domains.
- When a domain must be independently deployed (worker, mobile API, admin portal with separate release), extract it at that point with a defined interface.

## Extraction Triggers (from auto_iq.md §6)

A separate worker is deployed independently; the admin portal needs its own release cycle; a native mobile app is added; shared packages are duplicated; background processing becomes operationally independent.
