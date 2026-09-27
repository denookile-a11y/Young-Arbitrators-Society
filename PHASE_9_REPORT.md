# PHASE 9 — CODEBASE PRODUCTION READINESS REPORT

Scope constraint honored throughout: only the repository was inspected. No Supabase project, database, Vercel account, or other external system was available or assumed. Every claim below is either **CODEBASE VERIFIED** (checked directly against source, or by running a repo-local command) or explicitly marked as requiring external verification.

---

## A. Repository Status

**PASS**

Next.js 16 App Router + TypeScript + Supabase (`@supabase/ssr`) + Zod + React Hook Form. No API routes exist — all mutations go through Next.js Server Actions (54 exported action functions across 21 files in `lib/actions/`). Structure matches the README's description. `next build`, `tsc --noEmit`, and `eslint` all run clean as of this phase.

## B. Authentication

**PASS**

Traced end to end:
- **Login** (`lib/auth/actions.ts`): real `supabase.auth.signInWithPassword`, no mock/bypass path. Validated with Zod before hitting Supabase. Generic "Incorrect email or password" on failure (doesn't reveal whether the email exists).
- **Redirect handling**: the post-login `redirectTo` is explicitly constrained to same-app `/admin` paths (`startsWith("/admin")`, rejects `//` and `://`), closing the open-redirect vector already fixed in Phase 5.
- **Logout**: `supabase.auth.signOut()` then redirect — no lingering client state to clear beyond the cookie Supabase manages.
- **Session refresh/validation**: `lib/supabase/middleware.ts` calls `supabase.auth.getUser()` on every matched request and rewrites cookies via `proxy.ts`'s matcher, which covers `/admin/:path*` plus effectively everything else (explicitly excluding static assets). This is what keeps SSR session state correct — removing it would silently break session persistence, per the code's own warning comment.
- **Route protection**: `proxy.ts` redirects unauthenticated requests to `/admin/*` (other than `/admin/login`) to the login page, and redirects an already-authenticated user away from `/admin/login`. This is real middleware-level enforcement, not a client-side check.
- **Disabled accounts**: `getCurrentAdmin()` filters on `is_active = true`; a deactivated admin's session still passes Supabase Auth but resolves to no `Admin` row, so every role check downstream (`hasRole(null, …)`) returns `false`.
- **CSRF**: not custom-implemented, but Next.js Server Actions carry framework-level Origin-header verification by default (no custom CORS/action config overrides this anywhere in the repo).

**Not verifiable from the repo:** whether a real login round-trip actually succeeds against live Supabase Auth, cookie behavior under a real production domain/HTTPS, and session expiry/refresh timing in practice. See section N.

**No brute-force protection exists** — this is a genuine gap, not a false negative: nothing in the repo rate-limits `loginAction`. Listed in Section M.

## C. Authorization

**PASS, with one flagged design gap**

Full map, verified in code (not assumed from earlier reports):

| Role | Rank | DB scope (RLS) | App-layer gate used |
|---|---|---|---|
| `super_admin` | 3 | Everything, including `admins` table itself | `requireAdmin("super_admin")` |
| `admin` | 2 | Everything except `admins` table management | `requireAdmin("admin")` |
| `editor` | 1 | All content tables, no department scoping | `requireAdmin`/`checkAdmin("editor")` (the default) |
| `department_admin` | 0, scope-limited (not part of the ladder) | Own department's rows only, on `departments` (update), `leadership_roles`, `department_members`, `publications`, `csr_projects` | **none reach this role — see below** |

- **IDOR/BOLA**: checked directly. Every department-scoped RLS policy filters at the row level (`department_id = current_admin_department()`), applied via `for all` so it covers `select`/`update`/`delete` alike. No code path uses a service-role key (verified: zero matches for `service_role` in application code), so RLS is always live, including on the admin edit pages that fetch by URL-supplied UUID. A guessed UUID belonging to another department returns nothing — confirmed by tracing `getContentById` and the `[id]` page loaders, not assumed.
- **Privilege escalation via role-select**: `updateAdminRoleAction`/`deactivateAdminAction` are backed by the `"super_admin manages admins"` RLS policy (both `using` and `with check` require `has_role('super_admin')`). Fixed in Phase 7 to also call `requireAdmin("super_admin")` explicitly, so a non-super_admin caller gets a clean rejection instead of a silent zero-row no-op.
- **Storage authorization**: `is_admin()`-gated on `storage.objects`; naming corrected in Phase 7 to accurately describe scope (any active admin, not "their own uploads" — there's no per-uploader ownership column to check).

**Genuine unresolved finding (new this phase):** `department_admin` is fully defined in the schema and correctly scoped in RLS, but has **no usable path through the application**. Every mutating Server Action gates on `checkAdmin`/`requireAdmin` with a minimum of `editor` (rank 1) or `admin` (rank 2). `department_admin` ranks 0 and is not part of that ladder (`hasRole` treats it as an exact match only), so it fails every single one of those checks — including on `publications`, `leadership_roles`, and `csr_projects`, the exact tables RLS scopes specifically for this role. A `department_admin` can log in and read their own department's content, but cannot create, edit, or delete anything, anywhere, through the CMS UI — even data RLS explicitly permits them to touch.

I did not fix this. It isn't a security hole (the app is *more* restrictive than the database, never less), but correcting it means deciding, module by module, whether `department_admin` should bypass the `editor`/`admin` floor when the row's `department_id` matches their own — a scoped authorization design change across ~4 action files, not a one-line correction. That's outside "smallest appropriate correction" for a role that may currently be intentionally unused/reserved. Flagged in Section M for a product decision.

## D. API Security

**PASS** (no traditional API routes exist — Server Actions audited instead)

There is no `app/api/` directory; the app has zero HTTP API route handlers. All server-side mutation happens through the 54 Server Actions in `lib/actions/`. Endpoint matrix (grouped by module — every action within a module shares the same auth/validation pattern, verified individually):

| Action group | Auth | Authorization | Input validation | Scope | Status |
|---|---|---|---|---|---|
| `auth/actions.ts` (login/logout) | N/A (pre-auth) | N/A | Zod (`loginSchema`) | Public | ✅ |
| `contact.ts`, `join.ts`, `newsletter-signup.ts` | None (intentionally public) | RLS insert-only policies (`with check (true)`) | Zod | Public, insert-only | ✅ (error messages sanitized this phase) |
| `make-content-actions.ts` (create/update, used by 8 content modules) | `checkAdmin("editor")` | RLS `for all` per table | Zod per-module schema | editor+ | ✅ |
| `content-status.ts` (publish/feature/delete, shared) | `requireAdmin("editor")`/`("admin")` for delete | RLS | N/A (status/boolean toggle only) | editor+ / admin+ for delete | ✅ |
| `departments.ts`, `leadership.ts`, `profiles.ts`, `gallery.ts`, `moot-documents.ts`, `conference-speakers.ts`, `conference-programme.ts` | `checkAdmin`/`requireAdmin` per action | RLS | Zod | editor+/admin+ per action | ✅ |
| `members.ts`, `newsletter.ts` | `requireAdmin("admin")` | RLS | N/A (state-only mutations) | admin+ | ✅ |
| `settings.ts` | `requireAdmin("super_admin")` (added Phase 7) | RLS | N/A | super_admin | ✅ |

No endpoint returns excessive data (queries use explicit `.select()` column lists, spot-checked across `lib/queries/`), no endpoint is accidentally public beyond the three intentionally-public forms, and every admin action fails closed (both an app-layer check and an RLS backstop) if either layer is misconfigured.

## E. Database / Migrations

**PASS — CODEBASE VERIFIED ONLY, see caveat**

- All 5 migration files plus `seed.sql` parse against the real PostgreSQL grammar (validated in earlier phases; re-confirmed no syntax changes were introduced this phase).
- Every table referenced anywhere in application code exists in the migrations — checked programmatically (extracted every `.from("...")` call site and diffed against every `create table` statement; zero orphans).
- No destructive statements (`drop table`, `drop column`, `truncate`) anywhere in the migration set.
- No duplicate policy names across the whole policy set.
- Foreign key ordering is correct: `admins.department_id` references `departments`, added via `alter table` in migration 002 *after* `departments` is created in the same file — not a forward reference.
- `types/database.ts` is hand-written (explicitly documented as such, pending real `supabase gen types`) — spot-checked `Member`/`members` and `Admin`/`admins` against their migrations; fields match exactly.

**This is codebase verification only.** I have not run these migrations against Postgres, cannot confirm they apply cleanly with `supabase db push`, and cannot confirm the hand-written types match what `supabase gen types` will actually produce once a real project exists. See Section N.

## F. Frontend/Backend Integration

**PASS**

Traced representative flows (publications create/edit, contact form, login) from UI → Server Action → Zod validation → Supabase call → RLS → response → UI state:
- Server Action signatures match the `useActionState`/form usage in every form component checked (`PublicationForm`, contact form, login form).
- Error and field-error shapes (`GenericFormState`, `ContactFormState`, `LoginActionState`) are consistently typed and consistently consumed on the client side.
- Loading/empty/error states are handled explicitly: `isSupabaseConfigured()` gates every list page with a real "not connected" state rather than fabricated data (verified in `members/page.tsx`, homepage, dashboard); `app/error.tsx` and `app/admin/(dashboard)/error.tsx` are both implemented, with a deliberate and correct asymmetry — the public boundary hides internal error text, the authenticated admin boundary shows it (intentional, since only an authenticated admin can reach it, and they need it to self-diagnose migration/RLS issues per the on-page guidance referencing `supabase/seed.sql`).
- TypeScript catches drift at the type layer; `tsc --noEmit` is clean.

## G. Security

**PASS, with fixes applied this phase**

Code-level pass across the requested categories:
- **SQL injection**: none found. All queries go through the Supabase/PostgREST query builder; the one hand-built filter expression (`lib/queries/search.ts`'s `.or()` string) explicitly escapes PostgREST's reserved characters (`,()\\`) before interpolating user input.
- **XSS**: no `dangerouslySetInnerHTML` usage found in the codebase; React's default escaping applies throughout.
- **CSRF**: covered by Next.js Server Actions' built-in Origin-header check; nothing in the repo disables or overrides it.
- **SSRF**: no server-side fetches of user-supplied URLs found.
- **Open redirect**: closed (see Section B) — `redirectTo` is strictly validated.
- **Unsafe file handling**: upload paths are generated with `crypto.randomUUID()`, uploaded with `upsert: false` — no path traversal or overwrite surface. File type/size validated client-side via Zod schemas before upload; bucket-level MIME/size enforcement is documented as an external (Supabase dashboard) step, correctly not claimed as done here.
- **Secret exposure**: no hardcoded credentials found anywhere in the codebase (checked). `.env.local.example` correctly separates public (`NEXT_PUBLIC_*`) from server-only (`SUPABASE_SERVICE_ROLE_KEY`) variables, and the service-role key is explicitly documented as unused by the CMS by design.
- **Insecure logging/information leakage — fixed this phase**: `contact.ts`, `join.ts`, and `newsletter-signup.ts` (the three unauthenticated public forms) were returning raw Postgres `error.message` text to anonymous visitors on any unhandled database error. Replaced with generic user-facing messages and `console.error` server-side logging, while preserving the specific unique-constraint-violation messaging that already existed. Admin-side actions intentionally continue to surface raw error text — that's a deliberate, already-documented design decision (admins are authenticated and need the detail to self-diagnose), not an oversight.
- **Insecure CORS**: no custom CORS configuration exists; nothing loosens the framework default.
- **Cookies**: session cookies are managed entirely by `@supabase/ssr`'s standard cookie handlers — no custom cookie code that could weaken flags. Actual flag values (`Secure`, `SameSite`) in a real deployed environment are external verification (Section N).

## H. Tests

**Commands executed:** `npm test` — not a defined script; no test runner (Jest/Vitest/Playwright) is installed or configured; no `*.test.*`/`*.spec.*`/`__tests__` files exist anywhere in the repository.

**Result: FAIL.** This is a real, unresolved gap, not something this phase could fix by writing a full suite from scratch without expanding scope far beyond "smallest appropriate correction." Flagged prominently in Section M with a concrete starting-point recommendation in Section O.

## I. Build / Typecheck / Lint

Commands executed, in this phase, after fixes:

| Command | Result |
|---|---|
| `npx eslint .` | **0 errors, 1 non-actionable warning** (down from 3 errors, 8 warnings) |
| `npx tsc --noEmit` | **Clean** |
| `npm run build` | **Clean** — all routes compile, no route/type errors |

The one remaining lint warning (`no-page-custom-font` on `app/layout.tsx`) is a Pages-Router-era rule firing on correct App Router usage (loading fonts once in the root layout is the recommended pattern here) — confirmed non-actionable, not suppressed.

## J. Configuration

**PASS**

- `.env.local.example` documents all three required variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) plus `NEXT_PUBLIC_SITE_URL`, with clear public-vs-server-only annotations.
- No hardcoded URLs found outside the documented, harmless placeholder fallbacks in `app/layout.tsx` (metadataBase), `app/sitemap.ts`, and `app/robots.ts`, all of which fall back to `https://yas.example.com` only when `NEXT_PUBLIC_SITE_URL` is unset — clearly commented as a local/dev-safe default, not something that silently ships wrong.
- `next.config.ts` sets baseline security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, restrictive `Permissions-Policy`) — a real, verified addition, not assumed.
- No insecure defaults found (e.g., no auth bypass flags, no debug-mode toggles left in).

## K. Documentation

**PASS — corrected this phase**

`README.md` was stale: it described most CMS CRUD pages and public pages as "not yet written," which was no longer true (all modules listed in "Project structure" have both admin and public pages implemented — verified against the actual `app/` tree). Updated the "Status" and "What's real vs. pending" sections to reflect the actual current state, including pointing to `PHASE_8_REPORT.md`/this report for the audit trail, and removed an unverifiable claim (a "live curl test" result) that this phase has no way to confirm. Setup instructions (install → create Supabase project → run migrations in order → copy env template → `npm run dev`) were checked against `package.json` scripts and are accurate.

## L. Issues Fixed

1. `app/admin/(dashboard)/leadership/people/page.tsx` — raw `<a>` tag → `next/link` `<Link>` (was breaking client-side navigation for that link, a real lint **error**).
2. `components/admin/toast.tsx`, `components/hero/video-hero.tsx` — two `react-hooks/set-state-in-effect` lint **errors**; both were legitimate external-system-sync patterns (URL param read-once, `matchMedia` subscription), so annotated with justified, rule-specific `eslint-disable` comments rather than restructuring working code.
3. Six unused-import/variable lint warnings removed across `lib/actions/conference-programme.ts`, `lib/actions/members.ts`, `lib/actions/newsletter.ts`, `lib/queries/homepage.ts`, `lib/queries/members.ts`, `components/admin/file-upload-field.tsx`, `components/ui/page-hero.tsx`.
4. **`lib/actions/contact.ts`, `lib/actions/join.ts`, `lib/actions/newsletter-signup.ts`** — raw Postgres error text was being returned to unauthenticated public visitors on database failure. Replaced with generic messages + server-side `console.error` logging; preserved existing specific handling for unique-constraint violations.
5. (Carried from Phase 7, already applied before this phase: storage policy naming fix; `requireAdmin("super_admin")` added to the two admin-role-management actions.)

Regression check after all fixes: `npx tsc --noEmit` clean, `npm run build` clean, `npx eslint .` clean (bar the one non-actionable warning).

## M. Remaining Codebase Issues

Genuine, unresolved, evidence-based:

1. **`department_admin` role is non-functional in the app layer** (Section C) — schema- and RLS-complete, but blocked from every mutation by app-layer role gates that don't recognize its scope-limited nature. Needs a product decision before a code fix.
2. **Zero automated test coverage** — no test runner configured, no tests written. This is the single largest gap standing between "builds and type-checks" and "verified to behave correctly."
3. **No brute-force protection on `loginAction`** — nothing rate-limits repeated failed login attempts at the application layer (Supabase Auth may apply its own server-side limits, but that's an external-platform behavior, not something in this repo).
4. **No rate limiting on the three public forms** (Contact, Join, Newsletter) or on `/search` — carried over from Phase 8, still unaddressed, still a "can wait" item rather than a blocker.
5. **No analytics/error monitoring wired in** (e.g., Sentry) — `console.error` calls exist at every failure point audited this phase, which is the right shape to plug a real monitoring service into later, but nothing currently ships those logs anywhere durable.
6. `/privacy` and `/terms` — footer links to both, neither page exists.
7. Minor: `publications.department_id` and `csr_projects` have no dedicated index for department-scoped lookups (the `department_admin` write policies filter on these columns). Low priority given current data volumes; worth a follow-up migration if department-scoped list views become slow.

## N. External Verification Required

None of the following were checked, claimed, or assumed — they require access this environment does not have.

| What to check | Why it matters | Expected result |
|---|---|---|
| Migrations actually apply via `supabase db push` | Syntax validation is not the same as a successful apply against a real Postgres instance (extensions, existing objects, permissions can all still fail) | All 5 migrations + seed apply cleanly, in order, no errors |
| RLS policies behave as traced, under a real authenticated session | Every authorization conclusion in Section C is based on reading the policy SQL, not observing it run | A `department_admin` test account can read/write only their own department's rows; an `editor` cannot touch the `admins` table; anonymous users see only `published` rows |
| Bootstrapping the first `super_admin` | Requires one manual step outside SQL, linking `auth.users` to `admins`, documented in `supabase/seed.sql` | Exactly one active `super_admin` row exists post-bootstrap |
| Production environment variables are set correctly on Vercel | Code only defines what variables it *expects*; it cannot confirm real values are present or correct | App boots with `isSupabaseConfigured()` returning `true`, no "not connected" states in production |
| Live cookie behavior (Secure/SameSite flags, session persistence across requests) | `@supabase/ssr`'s cookie handling is standard, but real behavior depends on the deployed domain, HTTPS, and Vercel's edge/serverless runtime specifics | Session persists across page loads and Server Action calls in production; cookies carry `Secure` in production |
| Live CORS/Origin behavior for Server Actions | Framework-default CSRF protection depends on Next.js correctly identifying the deployed origin | Cross-origin POSTs to Server Action endpoints are rejected in production the same way they are assumed to be here |
| A real file upload against a real Storage bucket | `components/admin/file-upload-field.tsx` has never executed against live Storage | Upload succeeds, `getPublicUrl()` returns a working URL, and the Storage RLS policies behave as traced |
| Production error behavior / logs | Confirms `console.error` calls are actually landing somewhere reachable (Vercel's function logs, at minimum) | Errors thrown in Server Actions are visible in Vercel's dashboard, not silently dropped |
| Actual `supabase gen types typescript` output vs. `types/database.ts` | The hand-written types are believed accurate but have never been diffed against a real generated file | No type drift; if there is any, it should be reconciled and `types/database.ts` retired in favor of the generated file |
| Domain/DNS and HTTPS configuration | Entirely outside the repository | Site resolves on the intended domain with a valid certificate |

## O. Recommended Next Phase

**Two tracks, as before, and they haven't changed in kind — only in what's left on each:**

**Codebase-side (I can still do more here if useful):**
- Stand up a minimal test runner (Vitest is the lowest-friction choice for a Next.js/TypeScript project like this) and write tests for the highest-value, lowest-effort targets first: the Zod validation schemas (pure functions, no environment needed), `hasRole()`'s ranking logic, and the redirect-safety check in `loginAction`. These don't require a live Supabase connection and would close a meaningful slice of Section H's gap without needing the real environment.
- Decide the `department_admin` question (Section M, item 1) and I can implement whichever direction is chosen.

**Only achievable with real environment access (unchanged from Phase 8):**
- Run the migrations, bootstrap the first `super_admin`, deploy to Vercel, and perform one real login + one real content edit + one real file upload — then return whatever actually errors.

**Recommendation:** do the codebase-side test-runner setup next, since it's the one remaining gap this environment can actually close, in parallel with (not instead of) starting the real-environment steps — they don't block each other.

---

## Summary

**CODEBASE READINESS: substantially ready.** Build, types, and lint are clean; authentication and authorization logic is sound and traced end-to-end; the security review found and fixed one real information-disclosure issue and several code-quality issues; migrations are internally consistent and reference-complete. The two honest gaps are the untested `department_admin` role path and the complete absence of automated tests.

**LIVE ENVIRONMENT READINESS: not yet established, and cannot be established from here.** Everything in Section N is unverified by necessity, not by omission. Codebase-ready is not the same claim as production-ready — that second claim only becomes available once the real-environment steps in Section O happen and their results come back.
