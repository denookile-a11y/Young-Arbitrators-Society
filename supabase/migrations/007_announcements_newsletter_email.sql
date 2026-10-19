-- ============================================================================
-- YAS Platform — Migration 007: announcement visibility, newsletter double
-- opt-in, durable email outbox
-- ============================================================================
-- NOT applied automatically. Review, then apply to a STAGING project first.
-- Mostly additive (new columns, indexes, one table). The NON-additive changes
-- are: the announcements public SELECT policy is replaced, the anonymous
-- newsletter INSERT policy and anon table privileges are removed, one trigger
-- is added, and NOT VALID length checks are added to contact_messages. All have
-- an explicit rollback at the bottom of this file.
--
-- DEPLOY ORDER: apply this migration and deploy the matching application code
-- together. Between the two, the OLD newsletter form (anonymous insert) fails
-- by design, and the NEW pages query columns that do not exist until applied.
-- PRE-FLIGHT on the target project (policy names must match what this file
-- drops, otherwise an old permissive policy would survive):
--   select policyname, cmd from pg_policies
--     where tablename in ('announcements','newsletter_subscribers') order by 1;
--
-- 1. announcements
--    * department_id  — NULL = global (homepage); set = shown on that
--                       department's page only.
--    * notify_subscribers / notified_at — admin opt-in to email subscribers,
--                       and a marker that fan-out has been queued.
--    * Public SELECT policy now also enforces the publish_at / expires_at
--      window. Previously a published row with a FUTURE publish_at (or an
--      expired one) was readable by anyone calling the API directly.
-- 2. newsletter_subscribers
--    * status + confirmed_at + token columns for double opt-in.
--    * Existing rows are NOT assumed to have consented: active rows become
--      'pending' (they must confirm before receiving announcement email);
--      rows with unsubscribed_at become 'unsubscribed'.
--    * The public INSERT policy is REMOVED (sign-ups go through the server
--      action with the service role). Before, anon could insert any column
--      values and learn from duplicate errors whether an email was subscribed.
-- 3. announcements trigger: only admin+ can enable subscriber emails; only the
--    server can change notified_at.
-- 4. contact_messages: database-level length bounds (NOT VALID: new rows only).
-- 5. email_outbox
--    * Durable queue. RLS enabled; NO public policies. The application writes
--      to it with the service-role key from server code only. Admins may read
--      it for diagnostics.
-- ============================================================================

-- ---------------------------------------------------------------- announcements
alter table announcements
  -- Default (restrict) delete behaviour, matching every other department_id FK in
  -- this schema. SET NULL would silently turn a deleted department's
  -- announcements into GLOBAL homepage announcements.
  add column if not exists department_id uuid references departments (id),
  add column if not exists notify_subscribers boolean not null default false,
  add column if not exists notified_at timestamptz;

create index if not exists announcements_department_idx on announcements (department_id);
create index if not exists announcements_notify_pending_idx
  on announcements (notify_subscribers, notified_at)
  where notify_subscribers and notified_at is null;

drop policy if exists "announcements published are public" on announcements;
create policy "announcements published are public" on announcements
  for select using (
    is_admin()
    or (
      status = 'published'
      and (publish_at is null or publish_at <= now())
      and (expires_at is null or expires_at > now())
    )
  );

-- Only admin+ may turn on subscriber emailing, and nobody but the server may
-- reset the 'already notified' marker. RLS cannot restrict individual columns
-- (editors legitimately write other announcement columns), so a trigger does.
-- PostgREST runs as the role in the JWT, so current_user identifies the caller;
-- server-side bookkeeping runs as service_role, local maintenance as postgres.
create or replace function announcements_guard_notify() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.notified_at := null;
    if new.notify_subscribers and not has_role('admin') then
      raise exception 'only an administrator may enable subscriber emails' using errcode = '42501';
    end if;
  else
    new.notified_at := old.notified_at;
    if new.notify_subscribers and not coalesce(old.notify_subscribers, false) and not has_role('admin') then
      raise exception 'only an administrator may enable subscriber emails' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_guard_notify on announcements;
create trigger announcements_guard_notify
  before insert or update on announcements
  for each row execute function announcements_guard_notify();

-- ---------------------------------------------------------------- newsletter
alter table newsletter_subscribers
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirm_token_hash text,
  add column if not exists confirm_token_expires_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz;

-- Backfill without inventing consent.
update newsletter_subscribers set status = 'unsubscribed'
  where unsubscribed_at is not null and status = 'pending';

create index if not exists newsletter_subscribers_status_idx on newsletter_subscribers (status);
create unique index if not exists newsletter_subscribers_token_idx
  on newsletter_subscribers (confirm_token_hash) where confirm_token_hash is not null;

-- The public sign-up policy is REMOVED, not narrowed. All sign-ups now go
-- through the server action (service role), which applies rate limiting, the
-- honeypot and the double opt-in flow. Leaving direct anon INSERT open would
-- let anyone bypass those controls through the public API, and a duplicate
-- insert returns a unique-violation error that reveals whether an address is
-- already subscribed.
drop policy if exists "newsletter signup is public insert-only" on newsletter_subscribers;
revoke all on newsletter_subscribers from anon;

-- Public contact form keeps its anon INSERT policy (it must work without the
-- service key), but now bounded at the database as well as in the app.
alter table contact_messages
  drop constraint if exists contact_messages_name_len,
  drop constraint if exists contact_messages_email_len,
  drop constraint if exists contact_messages_message_len;
alter table contact_messages
  add constraint contact_messages_name_len check (char_length(name) between 1 and 200) not valid,
  add constraint contact_messages_email_len check (char_length(email) between 3 and 320) not valid,
  add constraint contact_messages_message_len check (char_length(message) between 1 and 5000) not valid;

-- ---------------------------------------------------------------- outbox
create table if not exists email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'newsletter_confirm', 'announcement')),
  -- One logical email = one dedupe_key. Re-enqueueing the same key is a no-op,
  -- which is what makes retries and repeated processing safe.
  dedupe_key text not null unique,
  to_email text not null,
  reply_to text,
  subject text not null,
  text_body text not null,
  html_body text,
  headers jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'dead')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists email_outbox_due_idx on email_outbox (status, next_attempt_at);

alter table email_outbox enable row level security;
-- Belt and braces: no table privileges for public roles, then SELECT only for
-- signed-in admins (still gated by the RLS policy below).
revoke all on email_outbox from anon, authenticated;
grant select on email_outbox to authenticated;
drop policy if exists "email_outbox readable by admin+" on email_outbox;
create policy "email_outbox readable by admin+" on email_outbox
  for select using (has_role('admin'));
-- No insert/update/delete policies: only the service role (which bypasses RLS)
-- may write, from server-side code.

-- ============================================================================
-- ROLLBACK (manual; tested in a disposable database)
-- ============================================================================
-- WARNING: this discards the outbox contents, announcement notification
-- settings and every newsletter confirmation/consent record created after 007.
-- Subscribers, announcements and contact messages themselves are kept.
--
-- drop table if exists email_outbox;
-- alter table contact_messages
--   drop constraint if exists contact_messages_name_len,
--   drop constraint if exists contact_messages_email_len,
--   drop constraint if exists contact_messages_message_len;
-- grant all on newsletter_subscribers to anon;
-- create policy "newsletter signup is public insert-only" on newsletter_subscribers
--   for insert with check (true);
-- alter table newsletter_subscribers
--   drop column if exists confirmation_sent_at, drop column if exists confirm_token_expires_at,
--   drop column if exists confirm_token_hash, drop column if exists confirmed_at,
--   drop column if exists status;
-- drop trigger if exists announcements_guard_notify on announcements;
-- drop function if exists announcements_guard_notify();
-- drop policy if exists "announcements published are public" on announcements;
-- create policy "announcements published are public" on announcements
--   for select using (status = 'published' or is_admin());
-- alter table announcements
--   drop column if exists notified_at, drop column if exists notify_subscribers,
--   drop column if exists department_id;
