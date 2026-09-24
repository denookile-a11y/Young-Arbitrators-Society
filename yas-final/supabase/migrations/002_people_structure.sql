-- ============================================================================
-- YAS Platform — Migration 002: People & Structure
-- ============================================================================

-- ---------------------------------------------------------------------------
-- departments — Moot, Research, CSR, Conferences, Partnerships, Media
-- ---------------------------------------------------------------------------
create table departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  mandate text,
  status content_status not null default 'draft',
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admins
  add constraint admins_department_fk foreign key (department_id)
  references departments (id) on delete set null;

-- ---------------------------------------------------------------------------
-- profiles — a real person: name, portrait, bio, socials. Reused by
-- leadership_roles (who holds a role) and department_members (who's on a
-- department). One profile can hold multiple roles across editions.
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  full_name text not null,
  portrait_url text,
  bio text,
  email text,
  linkedin_url text,
  twitter_url text,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- members — general society membership (distinct from leadership/profiles,
-- which are public-facing; members is the private roster / newsletter-ish
-- registry captured via the /join form).
-- ---------------------------------------------------------------------------
create table members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  year_of_study text,
  edition_id uuid references editions (id),
  joined_at timestamptz not null default now(),
  status content_status not null default 'review', -- review = pending approval
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leadership_roles — Administration → Role → Person, scoped to an edition.
-- e.g. (2025/26, "President", profile: Jane Doe)
-- ---------------------------------------------------------------------------
create table leadership_roles (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references editions (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role_title text not null,           -- "President", "Head of Moot", "Deputy", ...
  department_id uuid references departments (id),
  is_executive boolean not null default false, -- true for President/VP-level roles
  order_index int not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- department_members — a profile's association with a department, distinct
-- from leadership (e.g. an ordinary department member, not necessarily a
-- named "role holder").
-- ---------------------------------------------------------------------------
create table department_members (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  edition_id uuid not null references editions (id) on delete cascade,
  title text, -- optional, e.g. "Associate"
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (department_id, profile_id, edition_id)
);

create index leadership_roles_edition_idx on leadership_roles (edition_id);
create index leadership_roles_department_idx on leadership_roles (department_id);
create index department_members_department_idx on department_members (department_id);
create index members_edition_idx on members (edition_id);

alter table departments enable row level security;
alter table profiles enable row level security;
alter table members enable row level security;
alter table leadership_roles enable row level security;
alter table department_members enable row level security;

-- Public reads: published only. Admin+: full read/write. department_admin:
-- read/write scoped to their own department where applicable.
create policy "departments published are public"
  on departments for select using (status = 'published' or is_admin());
create policy "departments writable by admin+"
  on departments for all using (has_role('admin')) with check (has_role('admin'));
create policy "department_admin manages own department"
  on departments for update using (
    has_role('department_admin') and id = current_admin_department()
  );

create policy "profiles published are public"
  on profiles for select using (status = 'published' or is_admin());
create policy "profiles writable by editor+"
  on profiles for all using (has_role('editor')) with check (has_role('editor'));

create policy "members insertable by anyone (join form)"
  on members for insert with check (true);
create policy "members readable by admin+"
  on members for select using (has_role('admin'));
create policy "members writable by admin+"
  on members for update using (has_role('admin'));
create policy "members deletable by admin+"
  on members for delete using (has_role('admin'));

create policy "leadership_roles published are public"
  on leadership_roles for select using (status = 'published' or is_admin());
create policy "leadership_roles writable by admin+"
  on leadership_roles for all using (has_role('admin')) with check (has_role('admin'));
create policy "department_admin manages own leadership_roles"
  on leadership_roles for all using (
    has_role('department_admin') and department_id = current_admin_department()
  ) with check (
    has_role('department_admin') and department_id = current_admin_department()
  );

-- SECURITY FIX: previously `using (true)`, which let anonymous users
-- enumerate department membership including rows pointing at profiles
-- still in draft/review. Now mirrors the child-table pattern used by
-- gallery_items / moot_documents: visibility follows the parent record.
create policy "department_members follow profile visibility"
  on department_members for select using (
    exists (
      select 1 from profiles p
      where p.id = profile_id and (p.status = 'published' or is_admin())
    )
  );
create policy "department_members writable by admin+"
  on department_members for all using (has_role('admin')) with check (has_role('admin'));
create policy "department_admin manages own department_members"
  on department_members for all using (
    has_role('department_admin') and department_id = current_admin_department()
  ) with check (
    has_role('department_admin') and department_id = current_admin_department()
  );

create trigger departments_set_updated_at before update on departments
  for each row execute function set_updated_at();
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger members_set_updated_at before update on members
  for each row execute function set_updated_at();
create trigger leadership_roles_set_updated_at before update on leadership_roles
  for each row execute function set_updated_at();
