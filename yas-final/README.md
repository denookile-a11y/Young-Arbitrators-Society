# YAS Platform — Next.js + Supabase

Full-stack rebuild of the Young Arbitrators Society website: Next.js 16 (App
Router) + TypeScript + Tailwind CSS v4 + Framer Motion + Supabase + Zod +
React Hook Form, migrating the original static HTML build into a real,
database-backed institutional platform.

## Status

This is a feature-complete CMS + public site, verified through Phase 9
(codebase production-readiness audit) — not yet run against a real
Supabase project or deployed. Every CRUD module listed in "Project
structure" below has both its admin pages and its public-facing pages
built. See `PHASE_8_REPORT.md` and `PHASE_9_REPORT.md` for the detailed
audit trail: what's proven by static/build-time verification, what's
fixed, and what can only be confirmed once this runs against a real
database and a real deployment.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com).

3. **Run the migrations**, in order, via the Supabase SQL editor or CLI:
   ```bash
   supabase/migrations/001_core.sql
   supabase/migrations/002_people_structure.sql
   supabase/migrations/003_content.sql
   supabase/migrations/004_media_growth_storage.sql
   ```
   Then optionally `supabase/seed.sql` for starter departments + the
   current edition (read the comments in that file for the admin
   bootstrap steps — creating the first super_admin requires one manual
   step via the Supabase dashboard, since it can't be scripted in plain SQL).

4. **Copy the environment template and fill in real credentials:**
   ```bash
   cp .env.local.example .env.local
   ```
   Get `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   your project's Settings → API page.

5. **Run the dev server:**
   ```bash
   npm run dev
   ```

Without step 4, the app still runs and builds — the homepage and admin
dashboard both detect the missing connection and show an honest
"not connected" state instead of fake data.

## Project structure

```
app/                    Next.js App Router routes (one folder per page)
  admin/
    login/               Public login page
    (dashboard)/         Auth-gated CMS pages (route group, shares layout.tsx)
components/
  navigation/            SiteNav, SiteFooter
  hero/                  VideoHero (cinematic homepage background)
  admin/                 CMS-only components
lib/
  supabase/              client.ts (browser), server.ts (Server Components),
                         middleware.ts (session refresh helper), is-configured.ts
  auth/                  current-admin.ts, actions.ts (login/logout Server Actions)
  queries/                Server-side data-fetching functions per section
  validation/             Zod schemas
types/database.ts        Hand-written to match the SQL migrations exactly —
                         regenerate with `supabase gen types typescript`
                         once a real project exists
supabase/migrations/     Full schema: 20 tables, RLS policies, roles, storage
supabase/seed.sql        Starter data + admin bootstrap instructions
proxy.ts                 Route protection for /admin/* (Next.js 16's
                         successor to middleware.ts)
```

## Design system

Ported 1:1 from the original static build's CSS custom properties into
Tailwind's `@theme` block in `app/globals.css`. The palette, type pairing
(Fraunces serif / Manrope sans), and spacing conventions are unchanged —
`bg-navy-deep`, `text-gold`, `font-serif` etc. work as real Tailwind
utilities now instead of CSS variables.

## What's real vs. pending

Per the project directive: nothing here fakes a backend. Specifically:

- ✅ Real Supabase Auth (`supabase.auth.signInWithPassword`), no mock login
- ✅ Real server-side route protection (`proxy.ts`) — logic traced by hand
  and build-verified; behavior against a live session still needs
  confirming once deployed (see PHASE_9_REPORT.md, section N)
- ✅ Real SQL migrations with RLS, syntax-validated against the actual
  PostgreSQL parser — not yet run against a live project (no credentials
  in this environment)
- ✅ Real Supabase queries in `lib/queries/` — return empty/zero states
  honestly when no database is connected, never fabricated numbers
- ✅ All CMS CRUD modules built: Leadership (people + roles + editions),
  Departments, Moot, Research, Events, Conferences, Publications, Gallery,
  Partners, Members, Newsletter, CSR, Announcements, Settings
- ✅ All public dynamic pages built: `/`, `/about`, `/leadership`,
  `/departments`, `/research`, `/publications`, `/events`, `/conferences`,
  `/moot`, `/gallery`, `/partners`, `/csr`, `/archive`, `/search`,
  `/contact`, `/join`, plus each module's `[slug]` detail page
- ⏳ No automated test suite exists yet (no unit, integration, or e2e
  coverage) — see PHASE_9_REPORT.md, section H
- ⏳ Real content — the only seeded data is the committee roster, still in
  `draft`; no published research or events yet
- ⏳ Rate limiting on public forms (Join, Contact, Newsletter, Search)
- ⏳ Analytics/error monitoring (e.g. Vercel Analytics, Sentry)
- ⏳ `/privacy` and `/terms` pages — linked from the footer, not yet written
