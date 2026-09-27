-- ============================================================================
-- YAS Platform — Migration 006: department_admin read-scope fix
-- ============================================================================
-- FINDING (v10 independent audit): several "select" policies use the shape
--   status = 'published' or is_admin()
-- is_admin() returns true for EVERY active admin role, including
-- department_admin. That means a department_admin session can read
-- unpublished/draft/review/archived rows on tables scoped to OTHER
-- departments — e.g. a Moot department_admin could read a draft CSR
-- department_admin's unpublished publications, or read another
-- department's leadership_roles / department_members before they're
-- published, or update() another department's `departments` row's private
-- fields via a select-then-render admin UI.
--
-- FIX: introduce a helper that is true when either (a) the caller is a
-- global admin (admin/super_admin/editor — the existing non-scoped write
-- roles), or (b) the caller is THIS row's department_admin. Then swap it in
-- ONLY on the tables that actually carry department ownership:
--   departments, leadership_roles, department_members, csr_projects,
--   publications
--
-- Tables NOT touched here, and why: announcements, events, conferences,
-- conference_speakers, moots, moot_documents, research, research_documents,
-- partners, profiles, members, galleries, gallery_items,
-- newsletter_subscribers, timeline_entries, contact_messages — none of
-- these have a department_id column or any department-ownership concept.
-- A department_admin reading an unpublished row there is not cross-tenant
-- leakage (there is no tenant to leak across); it is the same
-- "any admin can preview drafts for the CMS" behavior editor/admin already
-- have, which the write-side policies already gate correctly. Broadening
-- this migration to touch those tables would not fix a real privilege
-- escalation and would risk unintended write-side side effects, since
-- `for all` policies mix read+write logic; a select-only fix keeps to the
-- department-owned tables.
-- ============================================================================

-- Global admin roles that were always intended to read everything,
-- regardless of department. Distinct from is_admin() (which also returns
-- true for department_admin) and from has_role('admin') (which is a *write*
-- floor and would exclude 'editor', who is intended to have global read).
create or replace function is_global_admin_reader() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins
    where id = auth.uid()
      and is_active = true
      and role in ('super_admin', 'admin', 'editor')
  );
$$;

comment on function is_global_admin_reader() is
  'True for admin/super_admin/editor sessions only — the roles with no '
  'department-scoping concept. Used in place of is_admin() on select '
  'policies for department-owned tables, so department_admin only reads '
  'unpublished rows in their own department instead of every department''s.';

-- ---------------------------------------------------------------------------
-- departments — a department_admin should see their OWN department's
-- unpublished record (e.g. draft mandate copy they're editing), but not
-- another department's draft record.
-- ---------------------------------------------------------------------------
drop policy if exists "departments published are public" on departments;
create policy "departments published are public" on departments
  for select using (
    status = 'published'
    or is_global_admin_reader()
    or (has_role('department_admin') and id = current_admin_department())
  );

-- ---------------------------------------------------------------------------
-- leadership_roles — has department_id (nullable: executive/global roles
-- have no department). A department_admin should read unpublished roles
-- for their own department only; global/null-department roles remain
-- readable once published, or to global admins pre-publication.
-- ---------------------------------------------------------------------------
drop policy if exists "leadership_roles published are public" on leadership_roles;
create policy "leadership_roles published are public" on leadership_roles
  for select using (
    status = 'published'
    or is_global_admin_reader()
    or (
      has_role('department_admin')
      and department_id is not null
      and department_id = current_admin_department()
    )
  );

-- ---------------------------------------------------------------------------
-- department_members — visibility currently follows the linked profile's
-- publish status. Extend so a department_admin can also see their own
-- department's membership rows tied to a still-unpublished profile (e.g.
-- a new member profile pending publication), without granting that for
-- other departments.
-- ---------------------------------------------------------------------------
drop policy if exists "department_members follow profile visibility" on department_members;
create policy "department_members follow profile visibility" on department_members
  for select using (
    exists (
      select 1 from profiles p
      where p.id = profile_id and p.status = 'published'
    )
    or is_global_admin_reader()
    or (
      has_role('department_admin')
      and department_id = current_admin_department()
    )
  );

-- ---------------------------------------------------------------------------
-- csr_projects — no department_id column; ownership is all-or-nothing via
-- "does this admin's own department have slug = 'csr'". Mirrors
-- canManageCsr() in lib/auth/department-scope.ts.
-- ---------------------------------------------------------------------------
drop policy if exists "csr_projects published are public" on csr_projects;
create policy "csr_projects published are public" on csr_projects
  for select using (
    status = 'published'
    or is_global_admin_reader()
    or (
      has_role('department_admin')
      and current_admin_department() = (select id from departments where slug = 'csr')
    )
  );

-- ---------------------------------------------------------------------------
-- publications — has department_id (nullable: society-wide news isn't tied
-- to one department).
-- ---------------------------------------------------------------------------
drop policy if exists "publications published are public" on publications;
create policy "publications published are public" on publications
  for select using (
    status = 'published'
    or is_global_admin_reader()
    or (
      has_role('department_admin')
      and department_id is not null
      and department_id = current_admin_department()
    )
  );
