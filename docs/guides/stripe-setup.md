# Stripe Setup Guide (Local Test Mode)

Sprint 13 wires AutoIQ's payment subsystem (ADR-013) to **Stripe, in
test/sandbox mode only**. This guide walks through everything needed to run
payments locally end to end — no live Stripe account, no real charges. Every
step below was actually run against a real Stripe test account during
implementation (not just written from documentation), including the checkout
success/decline/refund/webhook-dedup flows in the "Verify it works" section.

---

## 1. Create a free Stripe account and switch to test mode

1. Go to [stripe.com](https://stripe.com) and sign up for a free account (no
   card required — Stripe accounts start in test mode automatically).
2. If you already have a Stripe account used for other projects, make sure
   the dashboard's mode toggle (top-right, or the "Test mode" switch) is set
   to **Test mode**. AutoIQ must never be pointed at live keys — see Rule 8
   and ADR-013's PCI boundary section.

## 2. Find your test API keys

1. In the Stripe Dashboard (test mode), go to **Developers → API keys**.
2. Copy the **Publishable key** — starts with `pk_test_`.
3. Reveal and copy the **Secret key** — starts with `sk_test_`.
4. Add both to your `.env` (not `.env.example` — that file must stay a blank
   template since it's committed to the repo):

   ```
   PAYMENT_PROVIDER=stripe
   PAYMENT_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_PAYMENT_PUBLIC_KEY=pk_test_...
   ```

   `PAYMENT_WEBHOOK_SECRET` is filled in during step 4 below — leave it blank
   for now.

## 3. Install the Stripe CLI

The Stripe CLI forwards Stripe's webhook events to your local dev server —
this is what makes "local test mode" possible without deploying a public
HTTPS endpoint.

**Windows (winget):**

```powershell
winget install --id Stripe.StripeCli -e
```

**macOS (Homebrew):**

```bash
brew install stripe/stripe-cli/stripe
```

**Linux / manual:** download the latest release for your platform from the
[stripe-cli releases page](https://github.com/stripe/stripe-cli/releases).

Verify it installed:

```bash
stripe --version
```

You do **not** need to run `stripe login` (which opens a browser for OAuth).
Since you already have your `sk_test_...` secret key from step 2, pass it
directly with `--api-key` (or set the `STRIPE_API_KEY` environment variable)
on every `stripe` command below — this is what was used during
implementation and avoids the interactive browser flow entirely.

## 4. Run `stripe listen` to get your local webhook signing secret

With your dev server **not yet running** (or running — either order is
fine), run:

```bash
stripe listen --api-key sk_test_... --forward-to localhost:3000/api/v1/payments/webhooks/stripe
```

The CLI prints something like:

```
Ready! You are using Stripe API Version [...]. Your webhook signing secret is whsec_XXXXXXXXXXXX (^C to quit)
```

Copy that `whsec_...` value into `.env`:

```
PAYMENT_WEBHOOK_SECRET=whsec_XXXXXXXXXXXX
```

**Leave this `stripe listen` process running** in its own terminal for the
whole time you're testing payments locally — it's what delivers webhook
events (`payment_intent.succeeded`, `payment_intent.payment_failed`,
`charge.refunded`, etc.) from Stripe's servers to your local
`/api/v1/payments/webhooks/stripe` route. If you restart it, the printed
`whsec_...` secret stays the same for a given API key, so you shouldn't need
to update `.env` again unless you switch Stripe accounts.

Restart your dev server (`npm run dev`) after editing `.env` so the new
values are picked up (`lib/env.ts` reads `process.env` once at startup).

## 5. Test card numbers and what they produce

Use these in the Checkout screen's Stripe Payment Element (or via the Stripe
API directly, as in the verification steps below) — any future expiry date,
any 3-digit CVC, and any postal code work with all of them:

| Card number           | What happens                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `4242 4242 4242 4242` | Succeeds immediately. `PaymentIntent` → `SUCCEEDED`, `Invoice` → `PAID`.                     |
| `4000 0000 0000 0002` | Declined (`generic_decline`). `PaymentIntent` → `FAILED`, `Invoice` stays `ISSUED`.          |
| `4000 0025 0000 3155` | Requires 3D Secure authentication — the Payment Element shows a challenge modal to complete. |

Full list: [stripe.com/docs/testing](https://stripe.com/docs/testing).

## 6. Verify it works

With `npm run dev` and `stripe listen` both running, and at least one
inventory item or repair order available to check out against:

1. **Checkout success** — place a vendor order, hit "Pay Now" on its detail
   page, complete the Payment Element with `4242 4242 4242 4242`. You should
   land on the Payment Confirmation success screen, and the
   `stripe listen` terminal should show `payment_intent.succeeded` forwarded
   with a `200` response.
2. **Checkout decline** — repeat with `4000 0000 0000 0002`. You should land
   on the Payment Confirmation failure screen; `stripe listen` shows
   `payment_intent.payment_failed` forwarded with a `200`.
3. **Refund** — as an admin, `POST /api/v1/admin/payments/transactions/{id}/refund`
   against a successful transaction. `stripe listen` shows `charge.refunded`
   forwarded; the Invoice moves to `PARTIALLY_REFUNDED` or `REFUNDED`.
4. **Duplicate webhook delivery** — from the Stripe Dashboard (Developers →
   Events) or via `stripe events resend evt_...`, resend an event that was
   already delivered. It should still return `200`, but nothing should be
   double-applied (check that no duplicate `PaymentTransaction`/`Commission`
   row was created) — the `(provider, providerEventId)` unique constraint on
   `WebhookEvent` is what guarantees this.
5. **Idempotency-key replay** — call
   `POST /api/v1/invoices/{id}/payment-intents` twice with the same
   `Idempotency-Key` header. The second call should return the exact same
   `paymentIntentId`/`clientSecret` without creating a second Stripe
   PaymentIntent.

All five of the above were run against a real Stripe test account during
this sprint's implementation, not just described here.

## Troubleshooting

- **`WEBHOOK_SIGNATURE_ERROR` / 400 on the webhook route** — `PAYMENT_WEBHOOK_SECRET`
  doesn't match the currently-running `stripe listen` session. Re-copy the
  `whsec_...` it prints and restart `npm run dev`.
- **Checkout page stuck on "Preparing secure checkout…"** — usually means
  `NEXT_PUBLIC_PAYMENT_PUBLIC_KEY` is missing/blank. This one must be a
  `NEXT_PUBLIC_` var and requires a dev server restart to be inlined into the
  client bundle.
- **`PAYMENT_PROVIDER_ERROR: PAYMENT_SECRET_KEY is not configured`** —
  `.env` wasn't picked up. Confirm the key is in `.env` (not just
  `.env.example`) and restart `npm run dev`.
- **Events never arrive locally** — confirm `stripe listen` is still running
  and its `--forward-to` URL matches your dev server's actual port.
