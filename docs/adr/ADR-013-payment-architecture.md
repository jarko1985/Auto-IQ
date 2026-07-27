# ADR-013: Payment Architecture

**Status:** Accepted
**Date:** 2026-07-23
**Supersedes:** Elaborates ADR-008 (Payment Provider Abstraction) and the payments-specific portion of ADR-011 (Outbox Pattern) with the concrete model shapes, state machines, and reconciliation plan Prompt 19 implements against. ADR-008's `Payment`/`PaymentTransaction`/`IdempotencyKey` sketch is renamed here (`Payment` → `PaymentIntent`) to match Prompt 18's explicit model list; ADR-008's decisions (PCI boundary, server-calculated totals, signature-verified webhooks) are unchanged and still binding.
**Update (Sprint 13 prep):** Stripe — first in ADR-008's UAE evaluation order — is confirmed as the Sprint 13 implementation target, in **test/sandbox mode only** (`sk_test_...`/`pk_test_...` keys, Stripe CLI or a test webhook endpoint for local delivery). No live Stripe account, no real charges. This satisfies Prompt 19's "local test mode" requirement directly rather than needing a separate mock provider. Three UI screens (Checkout: Review & Pay, Payment Confirmation, Invoice Detail) were generated in Stitch ahead of implementation — see CLAUDE.md's "Sprint 13 screens" note.

## Context

Prompt 18 (auto_iq.md) requires the payment subsystem to be designed — models, state machines, PCI boundary, failure handling, reconciliation, provider interface — **before** a gateway is implemented (Prompt 19 / Sprint 13). This sprint (12) is schema, interfaces, and documentation only: no `features/payments/service.ts`, no routes, no UI, no gateway SDK. Two existing domains will eventually pay through this subsystem without being modified themselves this sprint:

- **VendorOrder** (Sprint 8) — parts marketplace checkout was deliberately deferred ("no Cart/checkout step... Cart/Invoice/Payment are Sprint 12's Commerce domain, not this one").
- **RepairOrder** (Sprint 11) — the `INVOICED` status and the customer portal's disabled "Download Invoice" button have no backing `Invoice` record yet.

## Decision

### Model shapes

Eight new Prisma models (`prisma/schema.prisma`), all money in integer minor units with an explicit `currency` (Rule 4 — no floats anywhere in this domain):

| Model                | Purpose                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Invoice`            | What's owed for a `VendorOrder` or `RepairOrder`, independent of either domain's own status.                                  |
| `PaymentIntent`      | One checkout session/attempt against an `Invoice`.                                                                            |
| `PaymentTransaction` | Append-only ledger of gateway-reported money-movement attempts (authorize/capture/sale) under an intent.                      |
| `Refund`             | A refund against a specific successful `PaymentTransaction`.                                                                  |
| `Commission`         | Platform's cut of one successful `PaymentTransaction`, and what's owed to the recipient.                                      |
| `Payout`             | A batch payment of accumulated `Commission` rows to one vendor/garage `Organization`.                                         |
| `IdempotencyKey`     | Generic idempotency guard for client-initiated mutating payment requests.                                                     |
| `WebhookEvent`       | Generic inbound webhook log (per ADR-011's original intent — not payments-only, though payments is the only producer so far). |

**Linking to VendorOrder/RepairOrder without touching them:** `Invoice.payableType` (`VENDOR_ORDER` \| `REPAIR_ORDER`) + `Invoice.payableId` is a plain indexed scalar pair, deliberately **not** a Prisma relation — adding a relation would require a back-reference array field on `VendorOrder`/`RepairOrder`, which the task explicitly rules out changing this sprint. This has the same shape as the pre-existing `AuditLog.resourceId` polymorphic pattern (a bare string, no FK, the action/type enum implies what it points to). Consequence: there is no DB-level referential integrity between `Invoice` and its payable — the code that creates the `Invoice` (Prompt 19, or whichever sprint wires VendorOrder checkout / RepairOrder invoicing) is responsible for validating the referenced row exists. `PayableType` is additive — subscriptions and featured listings (Phase 5 of auto_iq.md) become new enum values later without a schema change to `Invoice` itself.

`Invoice.lineItemsSnapshot` (`Json`) freezes a copy of the source domain's line items (`RepairJob`/`RepairOrderPart` or `VendorOrderItem`) at issue time, so a rendered invoice/PDF never silently changes if those rows are edited later — this also means `Invoice` doesn't need its own `InvoiceLine` model (auto_iq.md §10 lists one; not needed given the snapshot approach and that both source domains already have their own itemized line-item models).

`Commission.recipientOrganizationId` and `Payout.recipientOrganizationId` reference `Organization` directly (a real Prisma relation — `Organization` isn't excluded from changes this sprint, only `VendorOrder`/`RepairOrder` are). Both `Vendor` and `Garage` are 1:1 with an `Organization`, so this is the existing stable anchor for "who gets paid" regardless of whether the payable is a vendor order or a repair order — no `vendorId`/`garageId` union needed.

`provider` fields (`PaymentIntent.provider`, `WebhookEvent.provider`, `Payout.provider`) are free-text `String`, not an enum — matching the existing `DiagnosticResult.aiProvider: String?` pattern — so adding a gateway is a data change, never a migration.

### State machines

Four explicit state machines, each a Prisma enum (with a graph comment, same convention as `RepairOrderStatus`) plus a code-level adjacency map in `features/payments/state-machines.ts` — not implicit status strings:

```
PaymentIntentStatus:      CREATED → REQUIRES_ACTION → PROCESSING → SUCCEEDED
                           CREATED → PROCESSING → SUCCEEDED (no extra customer action)
                           */PROCESSING/REQUIRES_ACTION → FAILED
                           FAILED → CREATED (retry, same intent) | CANCELED
                           CREATED/REQUIRES_ACTION → CANCELED | EXPIRED
                           SUCCEEDED terminal — refunds never reopen the intent

PaymentTransactionStatus: PENDING → SUCCEEDED | FAILED   (both terminal)

RefundStatus:              REQUESTED → PROCESSING → SUCCEEDED | FAILED
                            REQUESTED → CANCELED
                            FAILED/SUCCEEDED/CANCELED terminal — retry = new Refund row

PayoutStatus:               PENDING → PROCESSING → PAID | FAILED
                             PENDING → CANCELED
                             FAILED → PROCESSING | CANCELED
                             PAID → REVERSED (clawback)
```

`InvoiceStatus` and `CommissionStatus` are explicit enums too (documented with a comment, matching `SessionStatus`/`Severity`'s style) but don't get a dedicated adjacency map — Prompt 18 only requires code-level graphs for PaymentIntent/Transaction/Refund/Payout. `assertPaymentIntentTransition()` etc. in `features/payments/state-machines.ts` throw `ConflictError` on an illegal move, exactly like `features/repair-orders/service.ts`'s `assertTransition()` — Prompt 19's service layer must import these, not re-derive the graphs. Unit tests (`tests/features/payments/state-machines.test.ts`) assert self-consistency and a few representative transitions.

**Known limitation, deliberately not solved this sprint:** once a `Commission` reaches `INCLUDED_IN_PAYOUT`, a subsequent refund on its underlying transaction can't cleanly reverse it (the payout batch total has already been fixed). MVP resolution: mark the `Commission` `REVERSED` and net the amount against the recipient's _next_ payout rather than attempting to claw back a batch already in flight. Prompt 19 should apply this rule, not attempt a more general solution.

### PCI boundary

Card data (PAN, CVV, expiry) **never reaches an AutoIQ server, database column, or log line — full stop.** Concretely:

- `PaymentIntent.clientSecret` is an opaque token the client SDK uses to talk directly to the gateway's hosted/provider-secure UI (e.g. Stripe Payment Element, Checkout.com Flow) — AutoIQ never sees raw card fields, only the gateway's tokenized confirmation.
- `PaymentProvider.createPaymentIntent()` never accepts a card number, CVV, or PAN as an input parameter — the interface (`lib/payments/types.ts`) has no such field, by construction.
- `PaymentTransaction.rawResponseSnapshot` (`Json`, for reconciliation/debugging) must only ever contain what the gateway's webhook/API response already redacts (last 4 digits, brand, etc.) — never a full PAN. This is a code-review-time rule for Prompt 19's adapter, since Prisma can't enforce field-level content restrictions.
- This keeps AutoIQ out of PCI DSS SAQ A-EP/D scope, landing instead at SAQ A (the lightest tier, for merchants who fully outsource card handling to a PCI-compliant hosted/iframe/SDK flow) — the reason Prompt 19 is scoped to "hosted or provider-secure payment collection" and never a native card form.

### Failure handling and reconciliation plan

| Failure mode                                                                                                                                           | Detection                                                                                                                                | Resolution                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicate webhook delivery** (provider retries on non-2xx, or genuinely double-sends)                                                                | `WebhookEvent`'s `@@unique([provider, providerEventId])` constraint                                                                      | Insert hits `P2002` → treat as already-processed, return 200 without re-applying — same pattern Sprint 6 established for `DiagnosticResult`'s `P2002` race (re-fetch the winner instead of erroring).                                                                                          |
| **Retried client mutation** (e.g. "create payment intent" resubmitted by a flaky client)                                                               | `IdempotencyKey` row keyed on `(scope, key)`, `requestHash` compared against the stored hash                                             | Same key + same hash → replay the cached `responseSnapshot`. Same key + different hash → `IdempotencyConflictError` (409, `lib/payments/errors.ts`) — a genuine client bug, not a safe replay.                                                                                                 |
| **Webhook arrives before/without a matching local row** (e.g. webhook fires before our synchronous `createPaymentIntent()` response is even persisted) | `WebhookEvent.paymentIntentId` nullable; event is stored with `status: RECEIVED` regardless                                              | A reconciliation job (not built this sprint — no job runner exists yet, same documented gap as Sprint 8/10) periodically re-attempts unresolved `WebhookEvent` rows against `PaymentIntent.providerIntentId`.                                                                                  |
| **Local ledger vs. provider disagreement** (our `PaymentIntent.status` says `PROCESSING` but the provider says `SUCCEEDED`, e.g. a missed webhook)     | Provider is always the source of truth for money movement — local status is a cache of the last-seen provider state, never authoritative | Prompt 19 must implement an explicit reconciliation query (compare `PaymentIntent`s stuck in a non-terminal status past some age against a live provider lookup) — this sprint only lays down the fields (`providerIntentId`, `status`, `updatedAt`) it needs; the job itself is out of scope. |
| **Signature verification failure**                                                                                                                     | `PaymentProvider.verifyWebhookSignature()` throws `WebhookSignatureError`                                                                | Request rejected with 400 before the payload is ever parsed as trusted input; never marked `VERIFIED`, never processed.                                                                                                                                                                        |
| **Gateway call fails outright** (network/5xx)                                                                                                          | `PaymentProviderError.transient` flag (mirrors `AIProviderError`)                                                                        | Transient errors are safe to retry the gateway call under the _same_ idempotency key; non-transient errors surface to the caller without retry.                                                                                                                                                |

`WebhookEvent.attempts`/`lastError` track re-processing attempts for a stored-but-unresolved event, matching the retry-count fields other domains use for at-least-once handling. No `OutboxEvent`/background-poller (ADR-011's outbound half) is built this sprint — outbound side effects triggered by payment events (emails, notifications) remain out of scope until a job runner exists, same as every prior sprint's documented gap.

### Provider interface

`lib/payments/types.ts` — `PaymentProvider` interface, `PaymentProviderName` union, request/result types. `lib/payments/errors.ts` — `PaymentProviderError` (with a `transient` flag, mirroring `AIProviderError`), `WebhookSignatureError`, `IdempotencyConflictError`. No gateway SDK is imported anywhere in `lib/payments/` this sprint — Prompt 19 adds `lib/payments/{provider}/` adapters and `lib/payments/index.ts`'s env-driven `getPaymentProvider()` factory, exactly as ADR-008 specified.

```ts
interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  capturePaymentIntent(input: CapturePaymentIntentInput): Promise<PaymentIntentResult>;
  cancelPaymentIntent(providerIntentId: string): Promise<void>;
  createRefund(input: CreateRefundInput): Promise<RefundResult>;
  verifyWebhookSignature(input: WebhookVerificationInput): VerifiedWebhookEvent;
}
```

`lib/payments/` stays domain-agnostic — it returns its own minimal `PaymentProviderIntentStatus` vocabulary, not the Prisma `PaymentIntentStatus` enum; `features/payments/` (Prompt 19) is what maps a provider result onto our state machine. Same separation `lib/ai/` already keeps from `features/ai/`/`features/diagnostics/`.

### Env vars Prompt 19 must add to `lib/env.ts`

Not added this sprint (nothing reads them yet — same reasoning as not stubbing a provider), but locked in via `.env.example`:

- `PAYMENT_PROVIDER` — evaluation order for UAE launch per ADR-008: Stripe → Checkout.com → Network International → Amazon Payment Services. **Sprint 13 sets this to `stripe`.**
- `PAYMENT_SECRET_KEY` — Sprint 13: Stripe's **test-mode** secret key (`sk_test_...`). Never a `sk_live_...` key in this codebase until a dedicated production-readiness sprint explicitly says otherwise.
- `PAYMENT_WEBHOOK_SECRET` — Sprint 13: the signing secret from `stripe listen`/a test-mode webhook endpoint (`whsec_test_...`), used by `verifyWebhookSignature()`.
- `NEXT_PUBLIC_PAYMENT_PUBLIC_KEY` — the one payment var that is intentionally client-exposed (a publishable/tokenization key, not a secret by design — Rule 8 still holds). Sprint 13: Stripe's test-mode publishable key (`pk_test_...`), passed to the client-side Payment Element powering the "Checkout: Review & Pay" screen.

**Local test mode (Prompt 19 requirement):** the Stripe CLI (`stripe listen --forward-to localhost:3000/api/v1/payments/webhooks`) forwards test-mode events to the dev server, and Stripe's published test card numbers (e.g. `4242 4242 4242 4242` success, `4000 0000 0000 0002` decline) exercise the full `PaymentIntentStatus`/`PaymentTransactionStatus` state machine without a live account or real money — this is the "local test mode" Prompt 19 asks for, not a separate hand-rolled fake provider.

### Authorization (names only — not implemented this sprint)

No `PERMISSIONS` entries or routes exist yet. Prompt 19 will need, following the existing `resource:action[:own]` convention: `PAYMENT_READ_OWN` (customer — their own invoices/payment status), `ADMIN_PAYMENTS_MANAGE` (refunds, dispute handling), `ADMIN_PAYOUTS_MANAGE` (initiating/reviewing payouts). Garage/vendor-side "view what I'm owed" reuses the existing `VENDOR_ORDERS_MANAGE`/`GARAGE_REPAIR_MANAGE` context resolution pattern rather than new permissions.

### Audit trail

`AuditAction` gained `INVOICE_ISSUED`, `INVOICE_VOIDED`, `PAYMENT_INTENT_CREATED`, `PAYMENT_INTENT_STATUS_CHANGED`, `PAYMENT_TRANSACTION_RECORDED`, `REFUND_REQUESTED`, `REFUND_STATUS_CHANGED`, `COMMISSION_RECORDED`, `PAYOUT_INITIATED`, `PAYOUT_STATUS_CHANGED`, `WEBHOOK_EVENT_RECEIVED`, `WEBHOOK_EVENT_PROCESSING_FAILED` — added now (cheap, additive) so Prompt 19 writes to `AuditLog` from day one rather than retrofitting it, per Rule 7.

## Alternatives considered

- **Reuse `VendorOrderStatusHistory`/`RepairOrderStatusHistory`-style dedicated history tables for `PaymentIntent`/`Payout`.** Rejected: those tables exist because a human manually drives transitions over time and the audit need is "who changed it and why." Payment state is almost entirely webhook-driven; `PaymentTransaction` (each gateway-reported attempt) and `WebhookEvent` (each inbound event) already form that audit trail with better fidelity than a status-only history row would. `Payout` transitions _are_ admin-driven, but volume is low enough that `AuditLog` (already required by Rule 7) covers it without a dedicated table.
- **Give `Invoice`/`PaymentIntent` a real FK to `VendorOrder`/`RepairOrder` via a nullable column on each of those two models.** Rejected outright by the task scope this sprint — would touch two models explicitly marked out of bounds. Revisit if/when a future sprint decides the referential-integrity gap is worth a migration.

## Consequences

- Server always calculates `Invoice`/`PaymentIntent` amounts from the database — never trusted from the client (Prompt 19 must enforce this explicitly; nothing in this sprint's schema prevents a careless caller from doing otherwise).
- Financial records are never deleted; every model in this domain is insert/update-only with explicit terminal states, no hard deletes.
- `Invoice`/`PaymentIntent`/`PaymentTransaction`/`Refund`/`Commission`/`Payout`/`IdempotencyKey`/`WebhookEvent` exist in the schema with no service layer, no routes, and no UI yet — `npm run build`/`typecheck`/`lint` are the only verification this sprint; there is no runtime behavior to test end-to-end.
- Prompt 19 implements directly against this document: pick the first gateway in the evaluation order (Stripe), add the adapter under `lib/payments/stripe/`, wire `features/payments/{schemas,repository,service}.ts` on top of `features/payments/state-machines.ts`, add the routes and the four new permissions, and only then generate the first payment/checkout UI (no Stitch screens exist for this domain yet).
