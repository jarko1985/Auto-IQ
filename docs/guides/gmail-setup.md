# Gmail Setup Guide (Sending Real Email via SMTP)

AutoIQ's `EmailProvider` abstraction (`lib/email/`) defaults to a console
provider that only logs what it would send — nothing leaves your machine
until you configure a real provider. This guide wires up **Gmail SMTP with
an App Password** via `nodemailer` (`lib/email/gmail-provider.ts`) so
sign-up OTP codes, password reset links, and every other AutoIQ email
(welcome, staff invitations, booking/order updates, ...) actually get
delivered.

App Passwords are Google's supported path for this — the old "Allow less
secure apps" setting was removed in 2022, so this is the correct approach,
not a workaround.

---

## 1. Turn on 2-Step Verification

App Passwords only exist if 2-Step Verification is already enabled on the
Google account you want to send from.

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security).
2. Under "How you sign in to Google", turn on **2-Step Verification** if it
   isn't already on, and complete the setup (phone number, authenticator
   app, etc.).

## 2. Generate an App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   (this link only works once 2-Step Verification is on).
2. Enter a name to identify it — e.g. `AutoIQ Dev`.
3. Click **Create**. Google shows a 16-character password like
   `abcd efgh ijkl mnop` — copy it (spaces don't matter either way, but the
   example below strips them).
4. This password is shown only once. If you lose it, revoke it from the
   same page and generate a new one.

## 3. Configure AutoIQ

Add these to **both** `.env` and `.env.local` (this repo's dev server
currently reads `.env.local` with higher priority than `.env` — a stale
value in only one of the two silently wins, the same gotcha documented for
`DATABASE_URL` in CLAUDE.md's Neon-migration notes):

```
EMAIL_PROVIDER=gmail
GMAIL_USER=your-address@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
EMAIL_FROM=your-address@gmail.com
```

- `GMAIL_USER` is the full Gmail address you generated the App Password for.
- `GMAIL_APP_PASSWORD` is the 16-character password from step 2 — **not**
  your regular Gmail password.
- `EMAIL_FROM` is optional; it defaults to `GMAIL_USER` if omitted. Gmail
  SMTP always sends _as_ the authenticated account regardless of what you
  put here, so there's little reason to set it to anything else.

Restart the dev server after editing either env file — `lib/env.ts` only
reads `process.env` at process startup.

Leaving `EMAIL_PROVIDER` unset (or set to `console`) keeps every email
logged instead of sent — useful for local development without touching a
real inbox. All OTP/reset-link flows work identically either way; the
console provider logs the OTP code / reset link straight to the terminal in
place of an email arriving.

## 4. Sending limits

A regular Gmail account caps outbound mail at roughly **500 messages per
day**; a Google Workspace account allows about **2,000/day**. AutoIQ's own
volume (OTP codes, password resets, transactional notifications) is small
enough for this to be a non-issue in development and early production, but
if the app grows past that, graduate to a dedicated transactional provider
(Resend, SES, etc.) behind the same `EmailProvider` interface — no domain
code needs to change, only a new `lib/email/*-provider.ts` file and a new
`EMAIL_PROVIDER` value.

## 5. Troubleshooting

- **`Invalid login: 535-5.7.8 Username and Password not accepted`** — you
  used your regular Gmail password instead of an App Password, or
  2-Step Verification isn't actually enabled yet.
- **No email arrives, no error thrown** — check spam/junk first; Gmail's own
  spam filtering sometimes catches mail sent from a personal account with no
  custom domain/SPF/DKIM setup. This doesn't block delivery, just visibility.
- **`GMAIL_USER and GMAIL_APP_PASSWORD must be set to use EMAIL_PROVIDER=gmail`**
  — you set `EMAIL_PROVIDER=gmail` but left one of the other two vars empty;
  `lib/email/gmail-provider.ts` throws this explicitly rather than failing
  silently.
