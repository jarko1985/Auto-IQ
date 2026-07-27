# ADR-004: Auth.js v5 and RBAC

**Status:** Accepted  
**Date:** 2026-07-17

## Context

Need authentication supporting email/password, Google, Apple, and phone OTP (for UAE). Multi-tenant organizations (vendors, garages) require fine-grained authorization beyond a single role column.

## Decision

Auth.js v5 (NextAuth v5) with Prisma adapter. RBAC implemented via: `User`, `Organization`, `OrganizationMembership`, `Role`, `Permission`, `MembershipRole` tables — see ADR-001 domain model.

## Consequences

- Every protected action checks: (1) authentication, (2) organization membership, (3) role + permission, (4) ownership/assigned scope, (5) resource state.
- Never perform authorization checks only in UI — always enforce server-side.
- Phone OTP uses a provider abstraction (`SmsProvider`) — not coupled to a specific SMS gateway.
- Apple Sign-In requires PKCE configuration; placeholder added in Sprint 1, activated when Apple dev account is ready.
- Audit events logged for: login, logout, failed auth, role changes, organization membership changes.
