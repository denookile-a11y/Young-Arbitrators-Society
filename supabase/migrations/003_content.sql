-- ============================================================================
-- YAS Platform — Migration 003: Content
-- ============================================================================
-- Every table here follows the shared content model from the directive:
--   id, title/name, slug, description, status, edition_id, featured,
--   order_index, created_at, updated_at
-- Public RLS policy is identical across all of them: "published, or is_admin()".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- announcements — homepage ticker + featured banner. Admin can draft,
-- schedule (publish_at in the future), publish, feature, archive.
-- ---------------------------------------------------------------------------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text,
  category text, -- e.g. "Moot", "Research", "Leadership" — for the ticker tag
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  publish_at timestamptz,      -- scheduled publish
  expires_at timestamptz,      -- auto-drops from prominent placement after this
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  registration_url text,
  cover_image_url text,
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conferences (+ speakers, many-to-one)
-- ---------------------------------------------------------------------------
create table conferences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  theme text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  programme jsonb, -- array of {time, title, location}
  registration_url text,
  report_url text,
  cover_image_url text,
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conference_speakers (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references conferences (id) on delete cascade,
  profile_id uuid references profiles (id),
  -- allow a speaker who isn't in `profiles` (external guest) via plain fields:
  display_name text,
  role_title text,
  organisation text,
  photo_url text,
  order_index int not null default 0
);

-- ---------------------------------------------------------------------------
-- moots (+ documents, many-to-one)
-- ---------------------------------------------------------------------------
create table moots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  theme text,
  description text,
  problem_summary text,
  year int not null,
  registration_opens_at timestamptz,
  competition_starts_at timestamptz,
  results jsonb,          -- e.g. { "winner": "...", "runner_up": "...", "best_advocate": "..." }
  winning_team text,
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type moot_document_kind as enum
  ('problem', 'procedural_order', 'authorities', 'memorial', 'schedule', 'results', 'report', 'other');

create table moot_documents (
  id uuid primary key default gen_random_uuid(),
  moot_id uuid not null references moots (id) on delete cascade,
  kind moot_document_kind not null default 'other',
  title text not null,
  file_url text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- research (+ documents)
-- ---------------------------------------------------------------------------
create table research (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  abstract text,
  authors text[] not null default '{}',
  category text,   -- "Research Paper" | "Case Note" | "Policy Brief" | "Working Paper" | "Op-Ed"
  topic text,
  tags text[] not null default '{}',
  cover_image_url text,
  pdf_url text,
  published_on date,
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table research_documents (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null references research (id) on delete cascade,
  title text not null,
  file_url text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- csr_projects
-- ---------------------------------------------------------------------------
create table csr_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  location text,
  partner_org text,
  impact_stats jsonb, -- e.g. { "schools_reached": 4, "volunteer_hours": 30 }
  cover_image_url text,
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- publications — the newsroom (news / insight / announcement-style articles;
-- distinct from `announcements`, which is the ticker/banner system).
-- ---------------------------------------------------------------------------
create table publications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  category text, -- "News" | "Insight" | "Announcement" | "Opinion"
  department_id uuid references departments (id),
  cover_image_url text,
  published_on date,
  status content_status not null default 'draft',
  featured boolean not null default false,
  edition_id uuid references editions (id),
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- partners
-- ---------------------------------------------------------------------------
create table partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  website_url text,
  tier text, -- e.g. "institutional" | "sponsor" | "in-kind"
  status content_status not null default 'draft',
  featured boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index announcements_status_idx on announcements (status, featured);
create index events_starts_at_idx on events (starts_at);
create index conferences_starts_at_idx on conferences (starts_at);
create index moots_year_idx on moots (year);
create index research_published_on_idx on research (published_on desc);
create index publications_published_on_idx on publications (published_on desc);
create index conference_speakers_conference_idx on conference_speakers (conference_id);
create index moot_documents_moot_idx on moot_documents (moot_id);
create index research_documents_research_idx on research_documents (research_id);

-- ---------------------------------------------------------------------------
-- RLS — identical shape across every content table: public reads published
-- rows only, admin session (is_admin()) can also read drafts/review/archived
-- for CMS preview, and editor+ can write. department_admin gets a scoped
-- write policy only on the tables that carry a department_id.
-- ---------------------------------------------------------------------------
alter table announcements enable row level security;
alter table events enable row level security;
alter table conferences enable row level security;
alter table conference_speakers enable row level security;
alter table moots enable row level security;
alter table moot_documents enable row level security;
alter table research enable row level security;
alter table research_documents enable row level security;
alter table csr_projects enable row level security;
alter table publications enable row level security;
alter table partners enable row level security;

create policy "announcements published are public" on announcements
  for select using (status = 'published' or is_admin());
create policy "announcements writable by editor+" on announcements
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "events published are public" on events
  for select using (status = 'published' or is_admin());
create policy "events writable by editor+" on events
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "conferences published are public" on conferences
  for select using (status = 'published' or is_admin());
create policy "conferences writable by editor+" on conferences
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "conference_speakers follow conference visibility" on conference_speakers
  for select using (
    exists (select 1 from conferences c where c.id = conference_id and (c.status = 'published' or is_admin()))
  );
create policy "conference_speakers writable by editor+" on conference_speakers
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "moots published are public" on moots
  for select using (status = 'published' or is_admin());
create policy "moots writable by editor+" on moots
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "moot_documents follow moot visibility" on moot_documents
  for select using (
    exists (select 1 from moots m where m.id = moot_id and (m.status = 'published' or is_admin()))
  );
create policy "moot_documents writable by editor+" on moot_documents
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "research published are public" on research
  for select using (status = 'published' or is_admin());
create policy "research writable by editor+" on research
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "research_documents follow research visibility" on research_documents
  for select using (
    exists (select 1 from research r where r.id = research_id and (r.status = 'published' or is_admin()))
  );
create policy "research_documents writable by editor+" on research_documents
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "csr_projects published are public" on csr_projects
  for select using (status = 'published' or is_admin());
create policy "csr_projects writable by editor+" on csr_projects
  for all using (has_role('editor')) with check (has_role('editor'));
-- SECURITY: this policy previously read `using (has_role('department_admin'))`
-- with no scoping whatsoever. csr_projects has no department_id column, so
-- there is nothing on the row to match against — instead we verify the
-- acting admin is assigned to the CSR department itself. Without this, any
-- department_admin (and, before the has_role fix, any active admin at all)
-- could write or delete every CSR project.
create policy "department_admin manages own csr_projects" on csr_projects
  for all using (
    has_role('department_admin')
    and current_admin_department() = (select id from departments where slug = 'csr')
  )
  with check (
    has_role('department_admin')
    and current_admin_department() = (select id from departments where slug = 'csr')
  );

create policy "publications published are public" on publications
  for select using (status = 'published' or is_admin());
create policy "publications writable by editor+" on publications
  for all using (has_role('editor')) with check (has_role('editor'));
create policy "department_admin manages own publications" on publications
  for all using (
    has_role('department_admin') and department_id = current_admin_department()
  ) with check (
    has_role('department_admin') and department_id = current_admin_department()
  );

create policy "partners published are public" on partners
  for select using (status = 'published' or is_admin());
create policy "partners writable by admin+" on partners
  for all using (has_role('admin')) with check (has_role('admin'));

-- updated_at triggers
create trigger announcements_set_updated_at before update on announcements for each row execute function set_updated_at();
create trigger events_set_updated_at before update on events for each row execute function set_updated_at();
create trigger conferences_set_updated_at before update on conferences for each row execute function set_updated_at();
create trigger moots_set_updated_at before update on moots for each row execute function set_updated_at();
create trigger research_set_updated_at before update on research for each row execute function set_updated_at();
create trigger csr_projects_set_updated_at before update on csr_projects for each row execute function set_updated_at();
create trigger publications_set_updated_at before update on publications for each row execute function set_updated_at();
create trigger partners_set_updated_at before update on partners for each row execute function set_updated_at();
