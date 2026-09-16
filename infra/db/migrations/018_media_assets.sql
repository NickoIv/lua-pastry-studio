-- Local media foundation (see docs/ARCHITECTURE.md "Media foundation").
-- A MediaAsset is the one governed record of anything an admin uploads:
-- what it is, where it lives, its real (sniffed, not client-declared)
-- MIME type, dimensions, size, who uploaded it, and whether it's still
-- in use. Products/collections keep displaying an image through their
-- existing `image_url` text column exactly as before (an admin pasting
-- an external URL still works) — an upload just points that same
-- column at this asset's served URL, so there is one display semantic
-- ("a URL string), not two. This table is what makes an upload
-- auditable/removable, not a new way to reference an image.
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('product', 'collection')),
  path text not null,
  url text not null,
  alt_text text,
  width integer,
  height integer,
  mime_type text not null,
  size_bytes integer not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  uploaded_by_staff_id uuid references staff_profiles(id),
  created_at timestamptz not null default now()
);

create index media_assets_status_idx on media_assets (status);

alter table media_assets enable row level security;

-- Readable by everyone signed in (Guest/Staff render product/collection
-- images), writable only by app_admin — mirrors the "Public catalog:
-- read-only for every authenticated role" shape from 006_rls.sql.
grant select on media_assets to app_customer, app_staff, app_admin;
grant insert, update on media_assets to app_admin;

create policy media_assets_read on media_assets for select using (true);
create policy media_assets_admin_write on media_assets for insert to app_admin with check (true);
create policy media_assets_admin_update on media_assets for update to app_admin using (true) with check (true);
