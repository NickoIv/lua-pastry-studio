-- Staff/customer profiles (local demo auth — see docs/LOCAL-BACKEND.md) and orders.

create table staff_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  role text not null check (role in ('BARISTA', 'WAITER', 'SHIFT_MANAGER', 'ADMIN', 'OWNER')),
  location_id uuid not null references locations(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customer_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  first_name text not null,
  last_name text,
  phone text not null,
  birth_date date,
  preferred_locale text not null default 'ru' check (preferred_locale in ('ru', 'kk', 'en')),
  home_location_id uuid references locations(id),
  favorite_product_ids uuid[] not null default '{}',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  external_order_code text unique,
  customer_id uuid references customer_profiles(id),
  location_id uuid not null references locations(id),
  staff_user_id uuid references staff_profiles(id),
  subtotal_minor_units integer not null check (subtotal_minor_units >= 0),
  discount_minor_units integer not null default 0 check (discount_minor_units >= 0),
  total_minor_units integer not null check (total_minor_units >= 0),
  currency text not null default 'KZT',
  -- OPEN: cart in progress (unused today). PAID_UNASSIGNED: a seeded/POS
  -- order paid at the till but not yet linked to a Lua Club member —
  -- see docs/ARCHITECTURE.md "Scenario A". COMPLETED: linked + points
  -- awarded. CANCELLED/REFUNDED: reserved for the reversal foundation.
  status text not null check (status in ('OPEN', 'PAID_UNASSIGNED', 'COMPLETED', 'CANCELLED', 'REFUNDED')),
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_minor_units integer not null check (unit_price_minor_units >= 0),
  line_total_minor_units integer not null check (line_total_minor_units >= 0)
);

create index orders_customer_id_idx on orders (customer_id);
create index orders_status_idx on orders (status);
