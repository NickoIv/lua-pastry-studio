-- Closes the gap called out in docs/ARCHITECTURE.md "Media foundation"
-- Known limitations: media_assets existed (018) but nothing referenced
-- it. Products/collections keep `image_url` as the one column Guest/
-- Admin ever read to render an image (no query in packages/server had
-- to change) — `media_asset_id` is additive governance metadata that
-- packages/server/src/routes/{adminCatalog,adminCollections}.ts now
-- derives automatically on every write by matching the submitted
-- `image_url` back to a `media_assets.url` (see those files): an
-- admin-uploaded image gets a real FK, a hand-pasted external URL
-- doesn't, and the two columns can never silently drift apart because
-- the FK is recomputed from image_url every time, never accepted as
-- separate client input. That's what makes this a single source of
-- truth rather than two independent fields to keep in sync by hand.
alter table products add column media_asset_id uuid references media_assets(id);
alter table collections add column media_asset_id uuid references media_assets(id);

create index products_media_asset_id_idx on products (media_asset_id) where media_asset_id is not null;
create index collections_media_asset_id_idx on collections (media_asset_id) where media_asset_id is not null;

-- Backfill: any product/collection whose image_url already matches an
-- uploaded asset's served URL (e.g. from testing this feature locally
-- before this migration existed) gets linked up retroactively. Rows
-- with a hand-pasted external URL, or no image at all, are untouched.
update products p set media_asset_id = m.id
  from media_assets m
  where p.media_asset_id is null and p.image_url = m.url;

update collections c set media_asset_id = m.id
  from media_assets m
  where c.media_asset_id is null and c.image_url = m.url;

-- Safe delete (docs/ARCHITECTURE.md "Media foundation"): an unused
-- asset can now actually be removed, not just archived — the DELETE
-- grant didn't exist in 018 because there was nothing to protect it
-- against yet. The FK above (plain RESTRICT, no ON DELETE clause) is
-- the real guard: Postgres itself refuses to delete a media_assets row
-- that a product/collection still points to, independent of whatever
-- the API layer's own pre-check says.
grant delete on media_assets to app_admin;
create policy media_assets_admin_delete on media_assets for delete to app_admin using (true);
