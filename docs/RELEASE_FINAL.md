# YAS final release: migrations, deployment and known limitations

## Migrations (fresh setup order)
`supabase/migrations/001_core.sql` to `007_announcements_newsletter_email.sql`, applied in numeric order. Verified in an isolated, disposable PostgreSQL 16 database (with the Supabase `auth`/`storage` pieces stubbed): 001 to 007 apply cleanly, 007 can be applied twice without error, `supabase/tests/rls_007.sql` passes 55 of 55, the rollback block restores the original policies. **Not verified against any live Supabase project.** `supabase/migrations.test.ts` checks the sequence, that no live statement is destructive, and that every table the code queries is created by a migration.

### If 007 was applied by hand while migration history still stops at 006
Do not rerun 007 blindly. 1) Read-only: confirm the schema really has it:
```sql
select
  exists (select 1 from information_schema.columns where table_name='announcements' and column_name='department_id') as ann_department_id,
  exists (select 1 from information_schema.columns where table_name='newsletter_subscribers' and column_name='status') as news_status,
  to_regclass('public.email_outbox') is not null as email_outbox,
  exists (select 1 from pg_trigger where tgname='announcements_guard_notify') as guard_trigger;
select policyname, cmd from pg_policies where tablename in ('announcements','newsletter_subscribers') order by 1;
```
All `true`, the announcements SELECT policy containing the publish/expiry window, and no `newsletter signup is public insert-only` policy mean 007 is fully applied. Then run `supabase/tests/rls_007.sql` on a **staging** copy. 2) Only then reconcile the history table so the CLI stops reporting 007 as pending: `supabase migration list` to see the exact version string, then `supabase migration repair --status applied <that version>`. A half-applied 007 (some `true`, some `false`) must be investigated, not repaired. 007 is repeatable (it uses `if not exists` and drop-then-create), so on staging re-applying inside one transaction (`psql --single-transaction -f ...`) is safe; do the same on production only after review and a backup.

## Deployment checklist
1. Set host environment variables (names only; see `.env.local.example` for explanations): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `NEXT_PUBLIC_SITE_URL`, `NEWSLETTER_TOKEN_SECRET` (32+ random chars), `CRON_SECRET` (16+ chars), `RESEND_API_KEY`, `EMAIL_FROM` (verified sending domain), optional `EMAIL_PROVIDER`, `CONTACT_TO_EMAIL`.
2. Apply migrations to staging (see above), run `rls_007.sql`, then production with a backup, together with this code.
3. Schedule the worker: call `GET /api/cron/email-outbox` every 5 to 15 minutes with `Authorization: Bearer <CRON_SECRET>` (host cron or external scheduler). **No schedule exists in this repository.** See `docs/EMAIL_OPERATIONS.md`.
4. Verify the email sending domain with the provider, then send one confirmation to an inbox you control. Do **not** run the legacy re-consent batch until that works; it is a separate, explicit super-admin action.
5. Upload portraits: Admin > Leadership > People, field "Portrait" (public `images` bucket). Publish each profile and give it a role in the current edition.
6. After deploying, load `/`, `/leadership`, one `/leadership/<slug>` and one `/departments/<slug>` and confirm the leadership section, portraits and links.

## Known limitations
- **No portrait photographs of named people exist in the project.** Portraits come only from admin uploads stored on each profile. Until uploaded (and the profile published, with a role in the current edition) the site shows a neutral monogram, never an invented image.
- The exact phrase "The People Behind YAS" never existed in the repository history, any branch, or any supplied archive, so the reason it "disappeared" cannot be proven from source; see the root-cause section of the final report.
- The site has no dark/light theme system (no theme styles anywhere), so the leadership section follows the existing single ivory/navy/gold styling.
- A worker schedule, the email provider account and live-database checks are external and unverified here. Hosted Supabase and a real Windows machine were not tested.
- Unknown URLs for dynamic pages return HTTP 200 with the not-found page and `noindex` (streaming behaviour); most pages lack a `<main>` landmark and skip link (pre-existing).
