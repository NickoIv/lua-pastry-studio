-- Standards-based Web Push foundation (VAPID) — no third-party
-- messaging provider. A subscription is one browser/device endpoint;
-- a customer can have several (phone + desktop). Preferences are a
-- flat per-category opt-in, not a marketing-automation engine.
-- See docs/ARCHITECTURE.md "Push notifications" for the local/iOS
-- limitations this deliberately does not try to paper over.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_customer_id_idx on push_subscriptions (customer_id);

create table notification_preferences (
  customer_id uuid primary key references customer_profiles(id) on delete cascade,
  loyalty boolean not null default true,
  rewards boolean not null default true,
  promotions boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
alter table notification_preferences enable row level security;

-- UPDATE is needed too: re-subscribing the same endpoint goes through
-- `on conflict (endpoint) do update`, which is an UPDATE under the hood.
grant select, insert, update, delete on push_subscriptions to app_customer;
grant select on push_subscriptions to app_admin;
grant select, insert, update on notification_preferences to app_customer;

create policy push_subscriptions_self on push_subscriptions for all
  to app_customer
  using (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid)
  with check (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid);
create policy push_subscriptions_admin_read on push_subscriptions for select
  to app_admin using (true);

create policy notification_preferences_self on notification_preferences for all
  to app_customer
  using (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid)
  with check (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid);
