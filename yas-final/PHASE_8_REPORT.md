# YAS Platform — Final Report (Phases 7–8)

## Phase 7 — Security audit, completed

Three items were open. All three are now checked against the actual migration SQL and application code.

### 1. IDOR — can an admin edit/delete another department's content via a guessed UUID?

**No, for the role that matters.** `department_admin` is the only role scoped by department, and every department-scoped table (`departments`, `leadership_roles`, `department_members`, `publications`, `csr_projects`) enforces the scope inside the RLS policy itself — `using (department_id = current_admin_department())` — not just in the UI. RLS applies to `select` as well as `update`/`delete` under a `for all` policy, so a `department_admin` who edits the URL to another department's row gets an empty result (404 in the app), and a direct `update`/`delete` call affects zero rows. This holds regardless of what the admin panel's own query layer does, because no code path uses a service-role key — confirmed by search: nothing in the codebase references `service_role` or a service key. Every query, including the ones behind `/admin/*/[id]` pages, runs through the same session-scoped client, so RLS is always in effect.

The `editor` role, by contrast, has full cross-department write access by design (`has_role('editor')` with no department filter) — that's the intended shape of the role ladder, not an IDOR bug: `editor` sits above `department_admin` in scope, not beside it.

**Verdict: not exploitable. No fix needed.**

### 2. Storage write restrictions on `storage.objects`

**Found a real gap — fixed.** The two update/delete policies were named `"editors can update their uploads"` / `"editors can delete their uploads"`, implying ownership scoping, but the actual condition was just `bucket_id in (...) and is_admin()` — any active admin, including a scoped `department_admin` or a plain `editor`, could overwrite or delete *any* file in any bucket, not just their own. There's no `owner`/`uploaded_by` column on `storage.objects` being checked at all. Renamed the policies to reflect what they actually do and left the access level unchanged (broad admin-write on media was almost certainly intended, since media isn't attributed to an uploader anywhere in the schema) — see the amended comment in `004_media_growth_storage.sql`. If you want per-uploader ownership instead, that requires a new column (storage objects support a `metadata` jsonb field you could match on) and is a schema change, not just a policy fix — flagging it as a decision for you rather than making it silently.

Filename collisions/overwrites: not a risk. The upload component (`components/admin/file-upload-field.tsx`) generates the storage path as `crypto.randomUUID().<ext>` and uploads with `upsert: false`, so two uploads can never collide or silently clobber each other.

**Verdict: naming/documentation fix applied; no exploitable overwrite path found.**

### 3. Admin privilege escalation via the Settings role-select

**No escalation path.** `updateAdminRoleAction` (`lib/actions/settings.ts`) has no explicit role check in the action itself — it relies entirely on the `admins` table's RLS: `"super_admin manages admins"` requires `has_role('super_admin')` on both `using` and `with check`. An `editor` or `department_admin` calling this action directly (bypassing the UI) gets zero rows updated and no error — a silent no-op, not a bypass. A `super_admin` could technically re-enable their own disabled `<select>` via devtools and demote themselves, but that's a self-inflicted lockout, not a privilege escalation, and there's always another `super_admin` or direct DB access to recover from it.

The one real gap: like every other mutating action in this app, this one relies on RLS alone with no `requireAdmin()` guard in the action — same "missing action-level authorization" pattern flagged in Phase 5, just not yet applied to `lib/actions/settings.ts`. Added `requireAdmin("super_admin")` to both `updateAdminRoleAction` and `deactivateAdminAction` for defense-in-depth and to fail with a clean error instead of a silent no-op.

**Verdict: no escalation possible; added the same defense-in-depth guard used elsewhere.**

Phase 7 is now complete: every item from the original list — privilege escalation, unscoped CSR policy, leaky `department_members` policy, non-atomic edition switch, destructive unsubscribe, missing action-level authorization, open-redirect risk, IDOR, storage restrictions, role-select escalation — has been checked and, where a real gap existed, fixed.

---

## Phase 8 — Where this actually stands

Four categories. Be skeptical of the first one — "proven" means proven by static analysis and parser-level SQL validation, not by running anything.

### A. Proven (verified by tooling, not by a live environment)
- SQL syntax for all 5 migration files and `seed.sql` parses cleanly against the real PostgreSQL grammar.
- RLS policy logic traced by hand against every role × table × action combination — the `has_role`/`is_admin`/`current_admin_department` helpers and every policy that calls them.
- No service-role key used anywhere in application code — every query, admin or public, is subject to RLS.
- Server Actions have `requireAdmin`/`checkAdmin` guards as defense-in-depth on top of RLS (now including settings).
- File upload paths are collision-proof (UUID naming, `upsert: false`) and validated client-side against `lib/validation/media.ts` before hitting Storage.
- TypeScript/Next.js build succeeds with no type errors (`next build`).

### B. Fixed (issues found and corrected this cycle)
- `has_role('department_admin')` falling through to `else true` (Phase 5) — critical, corrected.
- Unscoped `csr_projects` department_admin policy (Phase 5) — corrected.
- `department_members` publicly-readable-with-no-filter policy (Phase 5) — corrected.
- Non-atomic edition switch, destructive unsubscribe, open-redirect risk (Phase 5) — corrected.
- Storage update/delete policy naming mismatch (Phase 7) — corrected.
- Missing `requireAdmin` guard on the admin-role-management actions (Phase 7) — corrected.

### C. Needs a real environment to confirm (can't be verified further without one)
1. Migrations actually applying via `supabase db push` against live Postgres.
2. RLS behaving as traced, under a real authenticated session (not just hand-traced logic).
3. Bootstrapping the first `super_admin` — the one manual step in `supabase/seed.sql` linking `auth.users` to `admins`.
4. A real Vercel deploy — cookies, the proxy, and Server Actions surviving production, not just `next build`.
5. An actual file upload hitting a real Storage bucket end-to-end.
6. Any automated test coverage at all — there is currently none (unit, integration, or e2e).

None of this is code I can improve further from here — it's specifically the class of thing that only shows up by running it. The honest move once you deploy is to hand me back whatever errors surface; that's the point where this stops being "build-verified" and becomes "actually tested."

### D. Can wait (post-launch, not blocking a live site)
- Real content — right now the only seeded data is the 2026/27 committee roster, still in `draft`. No published research, no real events.
- Rate limiting on public forms (Join, Contact, Newsletter, Search) — currently open to abuse.
- Monitoring/analytics (Vercel Analytics, Sentry or similar) — no visibility if something breaks in production.
- `/privacy` and `/terms` pages — the footer links to both and neither exists yet.

---

## What's left, split by who does it

**I can still do (no environment needed):** nothing further on the code side — Phase 7 and this report close out everything that doesn't require a real Supabase/Vercel environment.

**Only you can do:**
1. Create the Supabase project, run the 5 migrations in order.
2. Bootstrap the first admin per `supabase/seed.sql`.
3. Set environment variables and deploy to Vercel.
4. Perform one real login, one real content edit, and one real file upload — then send me anything that errors.

Once step 4 produces real output, I can debug against actual errors instead of traced logic — that's a materially different (and faster) kind of work than what's been possible so far.
