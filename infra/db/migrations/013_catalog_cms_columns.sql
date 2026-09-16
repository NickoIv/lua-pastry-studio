-- Adds the columns Lua Admin's catalog CMS needs: soft-delete (active)
-- instead of hard deletes anywhere history depends on the row, slugs,
-- ordering, and updated_at bookkeeping. See docs/ARCHITECTURE.md
-- "Admin catalog CMS".

alter table product_categories
  add column slug text,
  add column active boolean not null default true,
  add column updated_at timestamptz not null default now();

update product_categories set slug = lower(regexp_replace(name ->> 'ru', '[^a-zA-Zа-яА-Я0-9]+', '-', 'g'))
  where slug is null;
alter table product_categories alter column slug set not null;
alter table product_categories add constraint product_categories_slug_key unique (slug);

alter table products
  add column active boolean not null default true,
  add column updated_at timestamptz not null default now();

alter table product_availability
  add column unavailable_reason text;

alter table collections
  add column subtitle jsonb,
  add column active boolean not null default true,
  add column sort_order integer not null default 0,
  add column updated_at timestamptz not null default now();
