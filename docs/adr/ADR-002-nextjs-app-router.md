# ADR-002: Next.js App Router

**Status:** Accepted  
**Date:** 2026-07-17

## Context

Need a React framework that supports SSR, server components, API routes, middleware, and easy Vercel deployment. Must also be migrable to AWS via Docker.

## Decision

Next.js 16 with App Router. Server Components by default; Client Components only for real interactivity. Route Handlers for public APIs. Server Actions for trusted same-app mutations.

## Alternatives

- **Pages Router** — rejected: App Router is the strategic direction; RSC reduces client bundle size significantly.
- **Remix** — rejected: smaller ecosystem, fewer UAE-relevant deployment options.
- **Standalone Express + React** — rejected: loses all Next.js optimizations and increases boilerplate.

## Consequences

- Server Components keep sensitive logic (DB queries, API keys) off the client.
- `next/font` provides zero-CLS font loading for Plus Jakarta Sans.
- `next-intl` integrates cleanly with App Router for `[locale]` routing.
- `typedRoutes` experimental flag catches broken links at build time.
- Dockerfile uses `next build` output; `output: "standalone"` enabled for AWS migration sprint.
