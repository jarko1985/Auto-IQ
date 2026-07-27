# ADR-008: Payment Provider Abstraction

**Status:** Accepted — elaborated by [ADR-013](./ADR-013-payment-architecture.md) (Sprint 12), which is the authoritative source for exact model shapes (`Payment`/`PaymentTransaction` below became `PaymentIntent`/`PaymentTransaction`), state machines, PCI boundary detail, and the reconciliation plan. The decisions below are unchanged and still binding.
**Date:** 2026-07-17

## Context

UAE payment gateway support varies. Stripe is globally familiar but UAE merchant setup has requirements. Local alternatives (Checkout.com, Network International, Amazon Payment Services) may be needed. Locking to one provider is a business risk.

## Decision

All payment logic goes behind a `PaymentProvider` interface. The gateway is selected by env var (`PAYMENT_PROVIDER`). Evaluation order for UAE launch: Stripe → Checkout.com → Network International → Amazon Payment Services.

## Consequences

- Server always calculates totals from the database — never trust client-provided amounts.
- Payment intents created server-side; hosted or provider-secure UI used for card collection (PCI boundary stays with the provider).
- Webhooks verified by signature before processing. Idempotency keys prevent duplicate event processing.
- `Payment`, `PaymentTransaction`, `Refund`, `IdempotencyKey` tables track full payment lifecycle.
- Financial records are never deleted; status history preserved.
- Provider-specific adapter lives in `lib/payments/{provider}/` — the interface contract never changes.
