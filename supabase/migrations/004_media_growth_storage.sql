-- ============================================================================
-- YAS Platform — Migration 004: Media & Growth + Storage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- galleries + gallery_items — a gallery is a named collection (e.g. "2025
-- National Moot — Final Round"); items are the individual images/videos,
-- optionally tied back to an event/conference/moot/csr project.
-- ---------------------------------------------------------------------------
create table galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text, -- "Moot" | "Conferences" | "CSR" | "Events" (matches the filter chips)
  cover_image_url text,
  event_id uuid references events (id),
  conference_id uuid references conferences (id),
  moot_id uuid references moots (id),
  csr_project_id uuid references csr_projects (id),
  status content_status not null default 'draft',
  featured boolean not null default false,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type gallery_item_kind as enum ('image', 'video');

create table gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries (id) on delete cascade,
  kind gallery_item_kind not null default 'image',
  file_url text not null,
  caption text,
  taken_on date,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  source text -- e.g. "homepage_footer"
);

-- ---------------------------------------------------------------------------
-- timeline_entries — the /about page's development timeline
-- ---------------------------------------------------------------------------
create table timeline_entries (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references editions (id),
  year_label text not null, -- "2023/24"
  title text not null,
  description text,
  order_index int not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_items_gallery_idx on gallery_items (gallery_id);
create index galleries_category_idx on galleries (category);

alter table galleries enable row level security;
alter table gallery_items enable row level security;
alter table newsletter_subscribers enable row level security;
alter table timeline_entries enable row level security;

create policy "galleries published are public" on galleries
  for select using (status = 'published' or is_admin());
create policy "galleries writable by editor+" on galleries
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "gallery_items follow gallery visibility" on gallery_items
  for select using (
    exists (select 1 from galleries g where g.id = gallery_id and (g.status = 'published' or is_admin()))
  );
create policy "gallery_items writable by editor+" on gallery_items
  for all using (has_role('editor')) with check (has_role('editor'));

create policy "newsletter signup is public insert-only" on newsletter_subscribers
  for insert with check (true);
create policy "newsletter_subscribers readable by admin+" on newsletter_subscribers
  for select using (has_role('admin'));
create policy "newsletter_subscribers writable by admin+" on newsletter_subscribers
  for update using (has_role('admin'));
create policy "newsletter_subscribers deletable by admin+" on newsletter_subscribers
  for delete using (has_role('admin'));

create policy "timeline_entries published are public" on timeline_entries
  for select using (status = 'published' or is_admin());
create policy "timeline_entries writable by editor+" on timeline_entries
  for all using (has_role('editor')) with check (has_role('editor'));

create trigger galleries_set_updated_at before update on galleries for each row execute function set_updated_at();
create trigger timeline_entries_set_updated_at before update on timeline_entries for each row execute function set_updated_at();

-- ============================================================================
-- Storage buckets
-- ============================================================================
-- Three buckets per the directive: images, documents, videos. All public-read
-- (so published media loads on the public site without a signed URL), but
-- writes are restricted to authenticated admins via storage policies.
insert into storage.buckets (id, name, public) values
  ('images', 'images', true),
  ('documents', 'documents', true),
  ('videos', 'videos', true)
on conflict (id) do nothing;

create policy "public can read images" on storage.objects
  for select using (bucket_id = 'images');
create policy "public can read documents" on storage.objects
  for select using (bucket_id = 'documents');
create policy "public can read videos" on storage.objects
  for select using (bucket_id = 'videos');

create policy "editors can upload images" on storage.objects
  for insert with check (bucket_id = 'images' and is_admin());
create policy "editors can upload documents" on storage.objects
  for insert with check (bucket_id = 'documents' and is_admin());
create policy "editors can upload videos" on storage.objects
  for insert with check (bucket_id = 'videos' and is_admin());

-- SECURITY NOTE: these are named "any admin", not "their uploads", on
-- purpose. storage.objects has no uploaded_by/owner column being checked
-- here, so there is no per-uploader ownership to enforce — any active
-- admin can replace or remove any file in these buckets. That matches the
-- rest of the schema (media isn't attributed to an uploader anywhere), but
-- if per-uploader ownership is ever wanted, it requires a schema change
-- (e.g. matching against the object's `metadata` jsonb), not just a policy
-- edit — flagging this as a product decision rather than assuming it.
create policy "any admin can update media" on storage.objects
  for update using (bucket_id in ('images', 'documents', 'videos') and is_admin());
create policy "any admin can delete media" on storage.objects
  for delete using (bucket_id in ('images', 'documents', 'videos') and is_admin());

-- Note: file TYPE and SIZE validation (JPG/PNG/WEBP/SVG for images;
-- PDF/DOCX/PPTX for documents; MP4 for videos; size limits) is enforced in
-- application code via the Zod schemas in lib/validation/media.ts BEFORE
-- upload, since Postgres storage policies can't inspect file content.
-- Configure bucket-level size limits and allowed MIME types in the Supabase
-- dashboard (Storage → bucket → Configuration) as a second layer of defense.
