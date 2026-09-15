-- Loyalty ledger, rewards, QR sessions, audit log.

create table loyalty_programs (
  id text primary key default 'default',
  is_active boolean not null default true,
  earn_rate_per_currency_unit numeric(6, 4) not null default 0.05,
  points_rounding_strategy text not null default 'round' check (points_rounding_strategy in ('floor', 'round', 'ceil')),
  min_order_amount_minor_units integer not null default 0,
  birthday_bonus_points integer not null default 1000,
  points_expire_after_days integer,
  tiers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- The ledger is the source of truth for points; there is deliberately no
-- customers.balance column anywhere in this schema — see
-- docs/ARCHITECTURE.md "Loyalty ledger". `points` carries its own sign.
create table loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles(id),
  type text not null check (
    type in ('earn', 'redeem', 'refund', 'manual_adjustment', 'birthday_bonus', 'campaign_bonus', 'expiration', 'reversal')
  ),
  points integer not null check (points <> 0),
  order_id uuid references orders(id),
  reward_redemption_id uuid,
  performed_by_staff_id uuid references staff_profiles(id),
  reason text not null,
  metadata jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint loyalty_transactions_sign_matches_type check (
    (type in ('earn', 'birthday_bonus', 'campaign_bonus') and points > 0)
    or (type in ('redeem', 'expiration') and points < 0)
    or (type in ('manual_adjustment', 'refund', 'reversal'))
  )
);

create index loyalty_transactions_customer_id_idx on loyalty_transactions (customer_id);

create table rewards (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  description jsonb,
  image_url text,
  linked_product_id uuid references products(id),
  points_cost integer not null check (points_cost > 0),
  is_active boolean not null default true,
  per_customer_limit integer,
  per_customer_limit_window_days integer,
  stock integer,
  created_at timestamptz not null default now()
);

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards(id),
  customer_id uuid not null references customer_profiles(id),
  points_cost integer not null check (points_cost > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
  fulfilled_by_staff_id uuid references staff_profiles(id),
  fulfilled_at timestamptz,
  loyalty_transaction_id uuid references loyalty_transactions(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index reward_redemptions_customer_id_idx on reward_redemptions (customer_id);

alter table loyalty_transactions
  add constraint loyalty_transactions_reward_redemption_id_fkey
  foreign key (reward_redemption_id) references reward_redemptions(id);

-- Only a digest of the raw QR payload is ever stored — see
-- docs/QR-SECURITY.md. The raw token exists only in the issuing
-- response and the guest's own QR image, never at rest server-side.
create table qr_sessions (
  id uuid primary key default gen_random_uuid(),
  token_digest text not null unique,
  purpose text not null check (purpose in ('IDENTITY', 'REWARD_REDEMPTION')),
  customer_id uuid not null references customer_profiles(id),
  reward_redemption_id uuid references reward_redemptions(id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_staff_id uuid references staff_profiles(id),
  constraint qr_sessions_reward_purpose_has_redemption check (
    (purpose = 'REWARD_REDEMPTION' and reward_redemption_id is not null)
    or (purpose = 'IDENTITY' and reward_redemption_id is null)
  )
);

create index qr_sessions_expires_at_idx on qr_sessions (expires_at);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_staff_id uuid references staff_profiles(id),
  target_type text not null,
  target_id text not null,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
