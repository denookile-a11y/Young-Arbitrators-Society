-- ============================================================================
-- RLS / constraint tests for migration 007.
-- Run ONLY against a disposable or staging database (never production):
--   psql -v ON_ERROR_STOP=1 -d <db> -f supabase/tests/rls_007.sql
-- Requires migrations 001-007 already applied. It creates and removes its own
-- rows (all prefixed 'rlstest') inside one transaction that is rolled back.
-- Each check prints PASS/FAIL; any FAIL makes the final query raise.
-- ============================================================================
begin;

create temp table results (name text, ok boolean, detail text);
grant all on results to public;

-- try(role, jwt sub, sql): run sql as that role; 'ok:<rows>' or 'err:<sqlstate>'.
create function pg_temp.try(role_name text, sub uuid, stmt text) returns text
language plpgsql as $$
declare r text; n int;
begin
  perform set_config('request.jwt.claim.sub', coalesce(sub::text, ''), true);
  execute format('set local role %I', role_name);
  begin
    execute stmt; get diagnostics n = row_count; r := 'ok:' || n;
  exception when others then r := 'err:' || sqlstate;
  end;
  reset role;
  return r;
end $$;

create function pg_temp.check(n text, expected text, got text) returns void
language plpgsql as $$
begin
  insert into results values (n, expected = got, 'expected ' || expected || ' got ' || got);
end $$;

-- personas -------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'rlstest-editor@x.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'rlstest-admin@x.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'rlstest-super@x.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'rlstest-plain@x.test'),
  ('00000000-0000-0000-0000-0000000000a5', 'rlstest-deptadmin@x.test');
insert into departments (id, slug, name, status, order_index) values
  ('00000000-0000-0000-0000-00000000d001', 'rlstest-a', 'RLS A', 'published', 90),
  ('00000000-0000-0000-0000-00000000d002', 'rlstest-b', 'RLS B', 'published', 91);
insert into admins (id, full_name, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'Editor', 'editor'),
  ('00000000-0000-0000-0000-0000000000a2', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000a3', 'Super', 'super_admin');
insert into admins (id, full_name, role, department_id) values
  ('00000000-0000-0000-0000-0000000000a5', 'DeptAdmin', 'department_admin', '00000000-0000-0000-0000-00000000d001');

-- fixtures (inserted as the migration owner) ---------------------------------
insert into announcements (slug, title, status, publish_at, expires_at, department_id) values
  ('rlstest-live-global',   'live global',   'published', now() - interval '1 day', null, null),
  ('rlstest-live-dept-a',   'live dept a',   'published', null, now() + interval '1 day', '00000000-0000-0000-0000-00000000d001'),
  ('rlstest-future',        'future',        'published', now() + interval '1 day', null, null),
  ('rlstest-expired',       'expired',       'published', null, now() - interval '1 day', null),
  ('rlstest-draft',         'draft',         'draft',     null, null, null),
  ('rlstest-archived',      'archived',      'archived',  null, null, null);
insert into newsletter_subscribers (id, email, status, confirmed_at) values
  ('00000000-0000-0000-0000-00000000e001', 'rlstest-confirmed@x.test', 'confirmed', now()),
  ('00000000-0000-0000-0000-00000000e002', 'rlstest-pending@x.test', 'pending', null);
insert into email_outbox (kind, dedupe_key, to_email, subject, text_body)
  values ('contact', 'rlstest:1', 'inbox@x.test', 's', 't');

-- A. announcements visibility ---------------------------------------------------
select pg_temp.check('A1 anon sees only live published (global + dept)', 'ok:2',
  pg_temp.try('anon', null, $$select 1 from announcements where slug like 'rlstest-%'$$));
select pg_temp.check('A2 anon cannot see a future-scheduled announcement', 'ok:0',
  pg_temp.try('anon', null, $$select 1 from announcements where slug = 'rlstest-future'$$));
select pg_temp.check('A3 anon cannot see an expired announcement', 'ok:0',
  pg_temp.try('anon', null, $$select 1 from announcements where slug = 'rlstest-expired'$$));
select pg_temp.check('A4 anon cannot see drafts/archived', 'ok:0',
  pg_temp.try('anon', null, $$select 1 from announcements where slug in ('rlstest-draft','rlstest-archived')$$));
select pg_temp.check('A5 plain signed-in non-admin sees only live', 'ok:2',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$select 1 from announcements where slug like 'rlstest-%'$$));
select pg_temp.check('A6 editor (admin area) sees every announcement', 'ok:6',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$select 1 from announcements where slug like 'rlstest-%'$$));
select pg_temp.check('A7 anon cannot insert announcements', 'err:42501',
  pg_temp.try('anon', null, $$insert into announcements (slug,title,status) values ('rlstest-x','x','published')$$));
select pg_temp.check('A8 anon cannot update announcements', 'ok:0',
  pg_temp.try('anon', null, $$update announcements set title='hacked' where slug='rlstest-live-global'$$));
select pg_temp.check('A9 plain authenticated user cannot insert announcements', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$insert into announcements (slug,title,status) values ('rlstest-y','y','published')$$));
select pg_temp.check('A10 editor can create a department announcement', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$insert into announcements (slug,title,status,department_id) values ('rlstest-e1','e1','draft','00000000-0000-0000-0000-00000000d002')$$));
select pg_temp.check('A11 department_admin cannot write announcements (unchanged behaviour)', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a5', $$insert into announcements (slug,title,status) values ('rlstest-d1','d1','draft')$$));

-- B. notification guard trigger -------------------------------------------------
select pg_temp.check('B1 editor CANNOT enable subscriber emails on insert', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$insert into announcements (slug,title,status,notify_subscribers) values ('rlstest-n1','n1','published',true)$$));
select pg_temp.check('B2 admin CAN enable subscriber emails', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$insert into announcements (slug,title,status,notify_subscribers) values ('rlstest-n2','n2','published',true)$$));
select pg_temp.check('B3 editor CANNOT flip notify on via update', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$update announcements set notify_subscribers=true where slug='rlstest-e1'$$));
-- notified_at is server-owned: an admin cannot reset it (that would re-open a send).
update announcements set notified_at = now() where slug = 'rlstest-n2';
select pg_temp.check('B4 admin update cannot clear notified_at', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$update announcements set notified_at = null where slug='rlstest-n2'$$));
insert into results select 'B5 notified_at survived the admin update', exists (select 1 from announcements where slug='rlstest-n2' and notified_at is not null), '';
select pg_temp.check('B6 service_role may reset/set notified_at', 'ok:1',
  pg_temp.try('service_role', null, $$update announcements set notified_at = now() where slug='rlstest-n2'$$));
select pg_temp.check('B7 insert cannot pre-set notified_at (forced null)', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$insert into announcements (slug,title,status,notified_at) values ('rlstest-n3','n3','draft',now())$$));
insert into results select 'B8 forced-null on insert', (select notified_at is null from announcements where slug='rlstest-n3'), '';

-- C. department deletion must not leak department announcements ----------------
select pg_temp.check('C1 deleting a department that has announcements is blocked', 'err:23503',
  pg_temp.try('postgres', null, $$delete from departments where id='00000000-0000-0000-0000-00000000d001'$$));

-- D. newsletter_subscribers -----------------------------------------------------
select pg_temp.check('D1 anon cannot insert a subscriber at all (no direct API sign-up)', 'err:42501',
  pg_temp.try('anon', null, $$insert into newsletter_subscribers (email,status) values ('rlstest-new@x.test','pending')$$));
select pg_temp.check('D2 anon cannot insert a pre-confirmed subscriber', 'err:42501',
  pg_temp.try('anon', null, $$insert into newsletter_subscribers (email,status,confirmed_at) values ('rlstest-new2@x.test','confirmed',now())$$));
select pg_temp.check('D3 anon cannot read subscribers (and learns nothing from duplicates)', 'err:42501',
  pg_temp.try('anon', null, $$select 1 from newsletter_subscribers$$));
select pg_temp.check('D4 anon cannot update/confirm a subscriber', 'err:42501',
  pg_temp.try('anon', null, $$update newsletter_subscribers set status='confirmed' where email='rlstest-pending@x.test'$$));
select pg_temp.check('D5 plain authenticated user cannot read subscribers', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$select 1 from newsletter_subscribers$$));
select pg_temp.check('D6 plain authenticated user cannot confirm anyone', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$update newsletter_subscribers set status='confirmed' where email='rlstest-pending@x.test'$$));
select pg_temp.check('D7 editor cannot read subscribers (admin+ only)', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$select 1 from newsletter_subscribers where email like 'rlstest-%'$$));
select pg_temp.check('D8 admin can read subscribers', 'ok:2',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$select 1 from newsletter_subscribers where email like 'rlstest-%'$$));
select pg_temp.check('D9 service_role can create a subscriber', 'ok:1',
  pg_temp.try('service_role', null, $$insert into newsletter_subscribers (email,status) values ('rlstest-svc@x.test','pending')$$));
select pg_temp.check('D10 duplicate email rejected by the unique constraint', 'err:23505',
  pg_temp.try('service_role', null, $$insert into newsletter_subscribers (email,status) values ('rlstest-svc@x.test','pending')$$));
select pg_temp.check('D11 invalid status rejected by CHECK', 'err:23514',
  pg_temp.try('service_role', null, $$insert into newsletter_subscribers (email,status) values ('rlstest-bad@x.test','vip')$$));

-- E. email_outbox ----------------------------------------------------------------
select pg_temp.check('E1 anon cannot read the outbox', 'err:42501',
  pg_temp.try('anon', null, $$select 1 from email_outbox$$));
select pg_temp.check('E2 anon cannot write the outbox', 'err:42501',
  pg_temp.try('anon', null, $$insert into email_outbox (kind,dedupe_key,to_email,subject,text_body) values ('contact','rlstest:a','a@x.test','s','t')$$));
select pg_temp.check('E3 plain authenticated user sees no outbox rows', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$select 1 from email_outbox$$));
select pg_temp.check('E4 editor sees no outbox rows', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$select 1 from email_outbox$$));
select pg_temp.check('E5 admin can read the outbox for diagnostics', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$select 1 from email_outbox where dedupe_key like 'rlstest:%'$$));
select pg_temp.check('E6 admin cannot write the outbox', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$insert into email_outbox (kind,dedupe_key,to_email,subject,text_body) values ('contact','rlstest:b','a@x.test','s','t')$$));
select pg_temp.check('E7 super_admin cannot write the outbox either (service role only)', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a3', $$update email_outbox set status='sent'$$));
select pg_temp.check('E8 service_role can enqueue', 'ok:1',
  pg_temp.try('service_role', null, $$insert into email_outbox (kind,dedupe_key,to_email,subject,text_body) values ('announcement','rlstest:c','a@x.test','s','t')$$));
select pg_temp.check('E9 duplicate dedupe_key is rejected at the database', 'err:23505',
  pg_temp.try('service_role', null, $$insert into email_outbox (kind,dedupe_key,to_email,subject,text_body) values ('announcement','rlstest:c','a@x.test','s','t')$$));
select pg_temp.check('E10 ON CONFLICT DO NOTHING enqueues nothing the second time', 'ok:0',
  pg_temp.try('service_role', null, $$insert into email_outbox (kind,dedupe_key,to_email,subject,text_body) values ('announcement','rlstest:c','a@x.test','s','t') on conflict (dedupe_key) do nothing$$));
select pg_temp.check('E11 invalid kind rejected', 'err:23514',
  pg_temp.try('service_role', null, $$insert into email_outbox (kind,dedupe_key,to_email,subject,text_body) values ('spam','rlstest:d','a@x.test','s','t')$$));
select pg_temp.check('E12 invalid status rejected', 'err:23514',
  pg_temp.try('service_role', null, $$update email_outbox set status='done' where dedupe_key='rlstest:1'$$));

-- F. contact_messages (anon insert preserved, now bounded) ----------------------
-- F1 inserts exactly one MARKED row; F6 reads back that same row. (try() does not roll back a
-- successful statement, so this is the only contact message the script creates.)
select pg_temp.check('F1 anon can still submit a contact message', 'ok:1',
  pg_temp.try('anon', null, $$insert into contact_messages (name,email,message) values ('rlstest-f1','rlstest-f1@x.test','hello')$$));
select pg_temp.check('F2 anon sees zero contact messages (RLS filters, no privilege error)', 'ok:0',
  pg_temp.try('anon', null, $$select 1 from contact_messages$$));
select pg_temp.check('F3 oversize message rejected at the database', 'err:23514',
  pg_temp.try('anon', null, format($f$insert into contact_messages (name,email,message) values ('n','a@x.test','%s')$f$, repeat('x', 5001))));
select pg_temp.check('F4 empty name rejected at the database', 'err:23514',
  pg_temp.try('anon', null, $$insert into contact_messages (name,email,message) values ('','a@x.test','hi')$$));
select pg_temp.check('F5 plain user cannot read contact messages', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$select 1 from contact_messages$$));
-- Filtered to the row F1 created, so the expected count is exactly 1 whatever else the table holds
-- (it was an unfiltered 'ok:2', which could never match this script's single insert).
select pg_temp.check('F6 admin can read the contact message anon submitted (F1)', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a2', $$select 1 from contact_messages where name = 'rlstest-f1'$$));
select pg_temp.check('F6b the same row is invisible to a plain user and to anon', 'ok:0',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a4', $$select 1 from contact_messages where name = 'rlstest-f1'$$));

-- G. site_settings (public read, admin-only write) ------------------------------
select pg_temp.check('G1 anon can read settings (public contact details)', 'ok:0',
  pg_temp.try('anon', null, $$select 1 from site_settings$$));
select pg_temp.check('G2 anon cannot write settings', 'err:42501',
  pg_temp.try('anon', null, $$insert into site_settings (key,value) values ('contact_email','"evil@x.test"')$$));
select pg_temp.check('G3 editor cannot write settings', 'err:42501',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a1', $$insert into site_settings (key,value) values ('contact_email','"evil@x.test"')$$));
select pg_temp.check('G4 super_admin can write settings', 'ok:1',
  pg_temp.try('authenticated', '00000000-0000-0000-0000-0000000000a3', $$insert into site_settings (key,value) values ('contact_email','"ok@x.test"')$$));
select pg_temp.check('G5 anon can read the saved setting', 'ok:1',
  pg_temp.try('anon', null, $$select 1 from site_settings where key='contact_email'$$));

-- report -------------------------------------------------------------------------
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else detail end as detail from results order by name;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from results;
do $$ begin
  if exists (select 1 from results where not ok) then raise exception 'RLS tests failed'; end if;
end $$;

rollback;
