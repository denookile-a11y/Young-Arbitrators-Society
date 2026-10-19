# Email, newsletter and announcements — operator guide

Variable NAMES only; never paste values into chats, tickets or commits.

## One-time setup
1. Verify a sending domain in Resend; set `RESEND_API_KEY`, `EMAIL_FROM` (and optionally `CONTACT_TO_EMAIL`).
2. Set `SUPABASE_SERVICE_ROLE_KEY`, `NEWSLETTER_TOKEN_SECRET` (>=32 random chars; keep stable — rotating it breaks unsubscribe links already sent), `CRON_SECRET` (>=16 chars), and a real `NEXT_PUBLIC_SITE_URL`.
3. Apply `supabase/migrations/007_*.sql` to STAGING first; run `supabase/tests/rls_007.sql` against it.
4. Schedule `GET /api/cron/email-outbox` with `Authorization: Bearer $CRON_SECRET` every 5-15 minutes (it retries failed mail and sends scheduled announcements once live).

Without provider config the site still works: contact messages are stored, nothing is delivered, and no success is claimed for delivery.

## Delivery guarantees (and their limits)
- One logical email = one `email_outbox.dedupe_key` (unique in the database). Re-enqueueing is a no-op.
- Workers claim a job with an optimistic lock (verified with 20 concurrent sessions: exactly one wins). The outbox id is the provider `Idempotency-Key`.
- Exactly-once is NOT guaranteed by any email system. If the provider accepts a message and the worker crashes before recording it, the job is retried with the same key; Resend dedupes for ~24 h. A retry after that window could send a duplicate.
- Failures retry with bounded backoff (1m, 5m, 25m, 2h cap), max 5 attempts, then `dead` (visible to admins in `email_outbox`).

## Confirmation links and opt-outs at delivery time
- **No usable confirmation link is stored.** A queued confirmation email contains only a random, non-secret nonce. The worker derives the real token at the moment of sending (an HMAC of the subscriber id and nonce, keyed by `NEWSLETTER_TOKEN_SECRET`) and substitutes the link into the message it hands to the provider. Reading `email_outbox` (or its backups) therefore never yields a working link; it would also need the secret. Only the SHA-256 hash of the token is kept on the subscriber row.
- **Opt-outs are enforced when the email is sent, not only at sign-up.** Immediately before every provider call the worker re-reads the subscriber: confirmation mail is sent only if the person is still pending, not unsubscribed, the link has not been superseded by a newer one, and it has not expired; announcements are sent only if the person is still confirmed and not unsubscribed. Anything else is marked `dead` with a `suppressed: ...` reason and is never retried. Temporary problems (database read failure, missing secret or site address) are retried with the normal backoff and nothing is sent meanwhile.
- **Rotating `NEWSLETTER_TOKEN_SECRET`** invalidates unsent confirmation emails (they are suppressed as superseded; the person can sign up again) as well as unsubscribe links already sent. Keep it stable.
- Announcement emails still carry a per-recipient unsubscribe link (a signature that can only opt that person out). That is intentional and is stored in the message body.

## Worker and scheduler: required deployment configuration
**Status in this repository: not configured.** The worker route exists (`GET /api/cron/email-outbox`) but there is no `vercel.json`, workflow or other schedule, and nothing here calls it. Until something does, queued mail is delivered only by the immediate best-effort attempt after an admin saves an announcement or a visitor signs up, failed sends are never retried, and scheduled announcements are never emailed. Choose one:
1. **Host cron** (for example Vercel Cron): add a cron entry for path `/api/cron/email-outbox` every 5 to 15 minutes in the host's configuration file, and set `CRON_SECRET` in the host's environment (check your host's documentation for how it authenticates scheduled calls; this route requires `Authorization: Bearer <CRON_SECRET>`).
2. **External scheduler** (any service that can send an HTTPS GET with a header): call the route every 5 to 15 minutes with that header.
Variables (names only): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (the real public address), `NEWSLETTER_TOKEN_SECRET` (32+ random characters), `CRON_SECRET` (16+ characters), `RESEND_API_KEY`, `EMAIL_FROM` (verified sender domain), optional `CONTACT_TO_EMAIL`. If `CRON_SECRET` is unset the route returns 401; with no `RESEND_API_KEY` or `EMAIL_FROM` it queues but sends nothing. The route's JSON reports `claimed`, `sent`, `retrying`, `dead` and `suppressed`. There is no outbox admin page; operators inspect `email_outbox` (admin read access) for `dead` rows and their `last_error`.

## Announcement emails
Opt-in per announcement ("Email subscribers", default off, admin+ only). Sent once to confirmed, not-unsubscribed subscribers. Publication never depends on email success. Scheduled announcements are emailed by the cron worker after they go live.

## Legacy subscribers (consent)
Subscribers stored before consent was recorded are migrated to `pending` (no assumed consent). They receive nothing until they confirm. Re-consent is an **operator action** on **Admin > Newsletter** (the "Legacy subscriber re-consent" panel), visible to and enforceable for **super admins only** (the server action re-checks the role; hiding the panel is not the control). It needs Migration 007 and the matching application code to be deployed together first.

**1. Preview (sends nothing).** Choose a batch size (10, 25, 50 or 100) and press *Preview*. It shows how many legacy subscribers the next batch would ask, plus the overall counts: legacy not yet asked, asked and awaiting confirmation, confirmed, unsubscribed. Preview never queues or sends anything and changes no record. Nothing runs on page load or refresh.

**2. Execute (separate, explicit).** Only after a successful preview does the *Send confirmation requests* control appear, and it stays disabled until you tick the acknowledgement. It queues the standard double opt-in confirmation email for the next batch. The server re-counts first and **refuses if the legacy total differs from the one you previewed** (a stale page, a double click, another operator); preview again if so. Each person is claimed with a single conditional update before their email is queued, so overlapping or repeated runs cannot email anyone twice.

**3. What the result means.** *Queued*: a confirmation email was placed in the outbox (it is delivered by the email worker only when delivery is configured; see the guarantees above). *Skipped*: no longer eligible when reached (already claimed, unsubscribed, or confirmed since the preview); nobody was emailed and an opt-out is never cleared. *Failed*: queueing failed; the claim is released so the person stays eligible, and the batch stops. Subscribers remain **pending** until they click their own link; the operation requests renewed confirmation and never establishes consent.

**4. Retrying safely.** After a failure or a budget stop (the hourly confirmation limit), wait if needed, then Preview and Execute again. Only people not yet asked are included, so nobody gets a second email. A batch may stop at *limit* with more people remaining; repeat until the legacy count is 0. A person is counted under "Asked, awaiting confirmation" from the moment they are claimed. If queueing fails the claim is released automatically; in the rare case the release itself also fails, that person is counted as asked although no email exists, so check the `email_outbox` table (admin read access) for a `newsletter_confirm` row for them. The person can still request a fresh link from the public sign-up form once the confirmation cooldown has passed.

**Separate, manual authorisations.** Applying Migration 007 and sending real email are independent decisions made by people. The code never applies a migration, and with no email provider configured the outbox only queues. Do not run a real batch until 007 is applied and a test confirmation has been delivered to an inbox you control.

## Timezones
Admin announcement times are Nairobi time (EAT, UTC+3) and stored as UTC instants. Rows saved BEFORE this change were interpreted as UTC, so a time entered as 09:30 was stored as 09:30Z (12:30 Nairobi). They are not rewritten automatically. Review upcoming ones:
`select slug, publish_at, expires_at from announcements where publish_at > now() or expires_at > now();`
and re-save any whose intended Nairobi time differs.

## Deployment prerequisites (checklist)
Environment variables (names only). Server-only, never `NEXT_PUBLIC_`: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_PROVIDER` (default `resend`), `CONTACT_TO_EMAIL` (optional), `NEWSLETTER_TOKEN_SECRET`, `CRON_SECRET`. Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

Order of operations:
1. Staging first: run the pre-flight `pg_policies` query at the top of migration 007, apply it, then run `supabase/tests/rls_007.sql` and `npm run test:integration` against staging.
2. Production: apply the migration and deploy the matching code together (the old newsletter form stops working the moment 007 is applied, by design). This re-consent workflow ships in that same code; it is only usable once 007 is applied, and it does nothing until a super admin presses Execute.
3. Set the environment variables on the host BEFORE the production build. The build reads the settings table; if Supabase variables are set but the database is unreachable the build now FAILS instead of baking default contact details into static pages.
4. Create the cron schedule, send one real test message of each kind (contact, confirmation, announcement) to an inbox you control, and confirm the unsubscribe link works.

## Known, deliberate limits
- Legacy subscribers stay `pending` until they confirm. The admin newsletter page now shows Confirmed / Pending confirmation / Unsubscribed, and "Reset to pending" never confirms anyone.
- Unused tracked media: `public/video/yas-hero.mp4` is corrupt (missing `moov` atom) and `yas-hero.webm` fails to parse; neither is referenced by any source file. They are left in place pending your decision.
- Per-IP rate limiting is per serverless instance (best effort). The database-backed hourly budgets and per-address cooldown are what bound abuse across instances.
