# Google OAuth Setup Guide ("Continue with Google")

`auth.ts` already wires a Google provider via Auth.js v5's `next-auth/providers/google`,
and `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are read from the environment — this
guide is only about obtaining real values for those two variables from
Google Cloud Console. Nothing in the code needs to change.

A new Google sign-in is automatically activated (`status: ACTIVE`,
`emailVerified` stamped) by `auth.ts`'s `jwt` callback the moment the first
token is issued — Google already verifies the email address, so AutoIQ
doesn't ask the user to verify it again.

---

## 1. Create or select a Google Cloud project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Use the project picker at the top to create a new project (any name,
   e.g. `AutoIQ UAE`) or select an existing one you control.

## 2. Configure the OAuth consent screen

1. In the left sidebar: **APIs & Services → OAuth consent screen**.
2. User type: **External** (unless you have a Google Workspace org and only
   ever want members of that org to sign in, in which case **Internal**
   skips the verification/test-user steps below entirely).
3. Fill in the required fields (app name, support email, developer contact
   email). Logo/domain fields are optional for development.
4. Scopes: add `openid`, `.../auth/userinfo.email`, and
   `.../auth/userinfo.profile` (these are next-auth's Google provider
   defaults — you don't need anything beyond them for sign-in).
5. Test users (only shown while the app's Publishing status is
   **Testing**): add every Google account you want to be able to sign in
   with during development. **Any Google account not on this list will be
   rejected at the consent screen** until the app is published/verified —
   this is the most common "it doesn't work" surprise, so don't skip it.

## 3. Create an OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: anything recognizable, e.g. `AutoIQ Web`.
4. **Authorized redirect URIs** — add one entry per environment you run.
   Auth.js's fixed callback path is `/api/auth/callback/google`:
   - Local dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-real-domain.com/api/auth/callback/google`

   Get this exactly right — Auth.js will reject the callback with a
   `redirect_uri_mismatch` error if it doesn't match one of these entries
   character-for-character (including the scheme and trailing path).

5. Click **Create**. Google shows a **Client ID** and **Client secret** —
   copy both.

## 4. Configure AutoIQ

Add both values to **both** `.env` and `.env.local` (see the note in
`docs/guides/gmail-setup.md` about why both matter in this repo):

```
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
```

Restart the dev server after editing either file.

## 5. Verify it works end to end

1. Start the dev server, go to `/sign-in` or `/sign-up`, click
   **Continue with Google**.
2. Sign in with a Google account that's on the Test users list (step 2.5)
   — any other account is rejected at Google's own consent screen, before
   it ever reaches AutoIQ.
3. You should land on `/post-login` and then be redirected into the app as
   an active `CUSTOMER` account (check `/api/v1/auth/session` — `status`
   should read `ACTIVE`, not `PENDING_VERIFICATION`).
4. If you want the account to have a role beyond plain `CUSTOMER` (vendor,
   garage, admin), that's granted the same way as any other account —
   through the relevant onboarding flow or an admin action — Google sign-in
   itself never assigns anything beyond `CUSTOMER`.

## Troubleshooting

- **`redirect_uri_mismatch`** — the URI Auth.js sent doesn't exactly match
  one of the Authorized redirect URIs in step 3.4. Check the scheme
  (`http` vs `https`), the port, and that it ends in
  `/api/auth/callback/google`.
- **"Access blocked: this app's request is invalid" / account not
  accepted at the consent screen** — the account isn't on the Test users
  list yet (step 2.5), or the consent screen isn't fully configured.
- **`invalid_client`** — `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are missing,
  swapped, or stale in whichever env file the dev server actually loaded.
- **100-user cap** — while the app's Publishing status is **Testing**,
  Google caps it at 100 test users total. Submitting the app for
  verification (Google's own review process) removes this cap when you're
  ready for real production traffic; not needed for development.
