-- ============================================================================
-- YAS Platform — Migration 005: Contact Messages
-- ============================================================================
-- Not part of the original 20-table spec, but the public /contact page
-- needs somewhere real to land submissions rather than faking a success
-- state with no persistence. Mirrors the newsletter_subscribers pattern:
-- public insert-only, admin-only read.
-- ============================================================================

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_created_at_idx on contact_messages (created_at desc);

alter table contact_messages enable row level security;

create policy "contact form is public insert-only" on contact_messages
  for insert with check (true);
create policy "contact_messages readable by admin+" on contact_messages
  for select using (has_role('admin'));
create policy "contact_messages updatable by admin+" on contact_messages
  for update using (has_role('admin'));
create policy "contact_messages deletable by admin+" on contact_messages
  for delete using (has_role('admin'));

-- ============================================================================
-- Atomic current-edition switch
-- ============================================================================
-- The application previously did this as two separate PostgREST calls
-- (unset all current, then set the new one). Those are two independent
-- transactions: if the second failed, the first had already committed and
-- the site was left with NO current edition, breaking /leadership and the
-- archive with no rollback.
--
-- This function performs both updates inside one transaction, so the
-- invariant enforced by editions_one_current_idx is never observed broken.
-- security definer + explicit role check: the caller must be admin+, matching
-- the "editions writable by admin+" policy.
create or replace function set_current_edition(target_edition uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role('admin') then
    raise exception 'insufficient privileges to change the current edition';
  end if;

  if not exists (select 1 from editions where id = target_edition) then
    raise exception 'edition % does not exist', target_edition;
  end if;

  update editions set is_current = false where is_current = true;
  update editions set is_current = true where id = target_edition;
end;
$$;
