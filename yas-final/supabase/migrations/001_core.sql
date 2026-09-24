-- ============================================================================
-- YAS Platform — Migration 001: Core (editions, admins, roles, site settings)
-- ============================================================================
-- Run these migrations in order via the Supabase CLI:
--   supabase db push
-- or paste each file into the SQL editor in order (001, 002, 003, 004).
-- ============================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------
create type content_status as enum ('draft', 'review', 'published', 'archived');
create type admin_role as enum ('super_admin', 'admin', 'editor', 'department_admin');

-- ---------------------------------------------------------------------------
-- editions — institutional containers ("2025/26", "2026/27", ...). Leadership,
-- members, and department assignments are scoped to an edition so past
-- administrations are archived, never overwritten.
-- ---------------------------------------------------------------------------
create table editions (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,              -- e.g. "2025/26"
  starts_on date not null,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one edition may be current at a time.
create unique index editions_one_current_idx on editions (is_current) where is_current = true;

-- ---------------------------------------------------------------------------
-- admins — links a Supabase Auth user to a role (and optionally a single
-- department, for department_admin). This table is the source of truth for
-- authorization; RLS policies throughout the schema check against it.
-- ---------------------------------------------------------------------------
create table admins (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role admin_role not null default 'editor',
  department_id uuid, -- FK added after `departments` is created (migration 002)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table admins is
  'Authorization source of truth. auth.users holds credentials; this table holds role.';

-- Helper used throughout RLS policies: is the current session an active admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins where id = auth.uid() and is_active = true
  );
$$;

-- Helper: does the current session have at least this role's privilege level?
-- super_admin > admin > editor in general scope. department_admin is NOT
-- part of that ladder — it is a scope-limited role, so it matches exactly
-- rather than being satisfied by any higher role.
--
-- SECURITY: the department_admin branch previously fell through to
-- `else true`, which made has_role('department_admin') return true for
-- EVERY active admin (including plain editors). Combined with the
-- department-scoped policies below, that allowed an editor to write rows
-- they should not have been able to touch. It now compares the role
-- directly.
create or replace function has_role(min_role admin_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins
    where id = auth.uid()
      and is_active = true
      and (
        case min_role
          when 'super_admin' then role = 'super_admin'
          when 'admin' then role in ('super_admin', 'admin')
          when 'editor' then role in ('super_admin', 'admin', 'editor')
          when 'department_admin' then role = 'department_admin'
        end
      )
  );
$$;

create or replace function current_admin_department() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from admins where id = auth.uid() and is_active = true;
$$;

alter table editions enable row level security;
alter table admins enable row level security;

-- editions: publicly readable (needed for the archive page + edition
-- switcher), writable only by admin+.
create policy "editions readable by everyone"
  on editions for select using (true);
create policy "editions writable by admin+"
  on editions for all using (has_role('admin')) with check (has_role('admin'));

-- admins: an admin can read their own row (for role-aware UI); only
-- super_admin can manage the admins table itself.
create policy "admins can read own row"
  on admins for select using (id = auth.uid());
create policy "super_admin manages admins"
  on admins for all using (has_role('super_admin')) with check (has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- site_settings — singleton-ish key/value store for global config (site
-- title, contact email, social links, newsletter provider config, etc.)
-- ---------------------------------------------------------------------------
create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admins (id)
);

alter table site_settings enable row level security;

create policy "site_settings readable by everyone"
  on site_settings for select using (true);
create policy "site_settings writable by admin+"
  on site_settings for all using (has_role('admin')) with check (has_role('admin'));

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger, reused by every content table below
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger editions_set_updated_at before update on editions
  for each row execute function set_updated_at();
create trigger admins_set_updated_at before update on admins
  for each row execute function set_updated_at();
