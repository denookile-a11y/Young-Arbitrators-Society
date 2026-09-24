-- ============================================================================
-- YAS Platform — Seed: current edition + admin bootstrap
-- ============================================================================
-- Run this AFTER migrations 001-004. Unlike the migrations, this file is
-- meant to be edited per-deployment, not run verbatim — see the bootstrap
-- steps below for the admin account, which cannot be scripted here because
-- it requires a real auth.users row created via Supabase Auth first.
-- ============================================================================

insert into editions (label, starts_on, is_current)
values ('2025/26', '2025-09-01', true)
on conflict (label) do nothing;

-- 2026/27 edition, seeded but NOT yet current — flip is_current via the
-- admin CMS (Leadership → set as current) once the incoming committee is
-- ready to go live, per the "no half-populated administration" convention.
insert into editions (label, starts_on, is_current)
values ('2026/27', '2026-09-01', false)
on conflict (label) do nothing;

insert into departments (slug, name, tagline, mandate, status, order_index) values
  ('moot', 'Moot', 'Advocacy training through competitive arbitration moots.',
   'The Moot Department designs and administers YAS''s moot competitions, from problem drafting through to final rounds, training members in written and oral advocacy.',
   'published', 1),
  ('research', 'Research', 'Scholarship on arbitration and ADR.',
   'The Research Department produces papers, case notes, and policy briefs examining arbitration and ADR in the Kenyan and East African context.',
   'published', 2),
  ('csr', 'CSR', 'Community legal outreach and access to justice.',
   'The CSR Department runs YAS''s community engagement initiatives, including partnership with the Elimu Legal Aid Clinic in Kirinyaga County.',
   'published', 3),
  ('conferences', 'Conferences', 'Convening practitioners, scholars, and institutions.',
   'The Conference Department plans and delivers YAS''s annual conference and smaller convenings throughout the year.',
   'published', 4),
  ('partnerships', 'Partnerships', 'Institutional relationships with firms and centres.',
   'The Partnerships Department manages YAS''s relationships with law firms, chambers, and arbitration centres.',
   'published', 5),
  ('media', 'Media & Communications', 'The Society''s public voice.',
   'The Media & Communications Department manages YAS''s editorial output, brand, and public communications.',
   'published', 6)
on conflict (slug) do nothing;

-- ============================================================================
-- 2026/27 COMMITTEE — from the official YAS Committee 2026/27 org chart.
-- Seeded as profiles + leadership_roles against the 2026/27 edition above.
-- All rows start as 'draft' so nothing appears publicly until reviewed and
-- explicitly published through the CMS, and the edition itself starts as
-- not-current — see the note on the 2026/27 edition insert above.
-- Portrait URLs are left blank; upload each portrait via the CMS (Storage
-- → images bucket) and set profiles.portrait_url per person.
-- ============================================================================
do $$
declare
  ed_2026_27 uuid;
  dept_moot uuid;
  dept_research uuid;
  dept_conferences uuid;
  dept_partnerships uuid;
  dept_media uuid;
  p_id uuid;
begin
  select id into ed_2026_27 from editions where label = '2026/27';
  select id into dept_moot from departments where slug = 'moot';
  select id into dept_research from departments where slug = 'research';
  select id into dept_conferences from departments where slug = 'conferences';
  select id into dept_partnerships from departments where slug = 'partnerships';
  select id into dept_media from departments where slug = 'media';

  -- President
  insert into profiles (slug, full_name, status) values ('aisha-swaleh', 'Aisha Swaleh', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, is_executive, order_index, status)
    values (ed_2026_27, p_id, 'President', true, 1, 'draft');
  end if;

  -- Deputy President
  insert into profiles (slug, full_name, status) values ('alex-mugio', 'Alex Mugio', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, is_executive, order_index, status)
    values (ed_2026_27, p_id, 'Deputy President', true, 2, 'draft');
  end if;

  -- Secretary
  insert into profiles (slug, full_name, status) values ('james-okwiri', 'James Okwiri', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, is_executive, order_index, status)
    values (ed_2026_27, p_id, 'Secretary', true, 3, 'draft');
  end if;

  -- Treasurer
  insert into profiles (slug, full_name, status) values ('sharleen-seneyian', 'Sharleen Seneyian', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, is_executive, order_index, status)
    values (ed_2026_27, p_id, 'Treasurer', true, 4, 'draft');
  end if;

  -- Head of Moot
  insert into profiles (slug, full_name, status) values ('dennis-okile', 'Dennis Okile', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Head of Moot', dept_moot, 5, 'draft');
  end if;

  -- Deputy Head of Moot
  insert into profiles (slug, full_name, status) values ('britney-vusha', 'Britney Vusha', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Deputy Head of Moot', dept_moot, 6, 'draft');
  end if;

  -- Head of Research
  insert into profiles (slug, full_name, status) values ('nkatha-kirimi', 'Nkatha Kirimi', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Head of Research', dept_research, 7, 'draft');
  end if;

  -- Deputy Head of Research
  insert into profiles (slug, full_name, status) values ('splendor-martin', 'Splendor Martin', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Deputy Head of Research', dept_research, 8, 'draft');
  end if;

  -- Partnerships
  insert into profiles (slug, full_name, status) values ('joan-bikeri', 'Joan Bikeri', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Partnerships', dept_partnerships, 9, 'draft');
  end if;

  -- Conference Director
  insert into profiles (slug, full_name, status) values ('michelle-moraa', 'Michelle Moraa', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Conference Director', dept_conferences, 10, 'draft');
  end if;

  -- Communications Director
  insert into profiles (slug, full_name, status) values ('fatuma-alio', 'Fatuma Alio', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, department_id, order_index, status)
    values (ed_2026_27, p_id, 'Communications Director', dept_media, 11, 'draft');
  end if;

  -- Committee Member (general, no department)
  insert into profiles (slug, full_name, status) values ('mary-waruinu', 'Mary Waruinu', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, order_index, status)
    values (ed_2026_27, p_id, 'Committee Member', 12, 'draft');
  end if;

  -- Students Coordinator (general, no department)
  insert into profiles (slug, full_name, status) values ('tamara-khalumi', 'Tamara Khalumi', 'draft')
    on conflict (slug) do nothing returning id into p_id;
  if p_id is not null then
    insert into leadership_roles (edition_id, profile_id, role_title, order_index, status)
    values (ed_2026_27, p_id, 'Students Coordinator', 13, 'draft');
  end if;
end $$;

-- ============================================================================
-- BOOTSTRAPPING THE FIRST ADMIN (super_admin)
-- ============================================================================
-- The `admins` table's `id` is a foreign key to `auth.users`, so a super_admin
-- account must be created in two steps — there is no way to script step 1
-- from a plain SQL migration:
--
-- 1. Create the auth user, either:
--      a) Supabase Dashboard → Authentication → Users → Add User, or
--      b) `supabase.auth.admin.createUser({ email, password })` from a
--         trusted server-side script using the SERVICE ROLE key (never the
--         anon key) — e.g. a one-off scripts/bootstrap-admin.ts, run locally,
--         never deployed.
--
-- 2. Insert the matching row into `admins`, using the UUID from step 1:
--
--      insert into admins (id, full_name, role, is_active)
--      values ('<uuid-from-auth-users>', 'Dennis Okile', 'super_admin', true);
--
-- After this, that account can log in at /admin/login and — because it's
-- super_admin — can create every other admin account through the CMS itself
-- (Admin → Settings → Team), rather than repeating this manual step.
-- ============================================================================
