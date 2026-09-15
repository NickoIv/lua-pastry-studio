-- Core catalog: locations, product categories/products/availability, collections.
-- Local dev cluster only — see infra/db/README or docs/LOCAL-BACKEND.md.

create extension if not exists pgcrypto;

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  lat double precision,
  lng double precision,
  phone text,
  open_hours text not null,
  is_active boolean not null default true
);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  sort_order integer not null default 0,
  image_url text
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references product_categories(id),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price_minor_units integer not null check (price_minor_units >= 0),
  currency text not null default 'KZT',
  image_url text,
  allergens text[] not null default '{}',
  is_seasonal boolean not null default false,
  is_new boolean not null default false,
  is_must_try boolean not null default false,
  created_at timestamptz not null default now()
);

create table product_availability (
  product_id uuid not null references products(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  in_stock boolean not null default true,
  daily_limit integer,
  primary key (product_id, location_id)
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  featured boolean not null default false
);

create table collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (collection_id, product_id)
);
