-- Row Level Security. Policies are written against the app_customer /
-- app_staff / app_admin roles from 004_roles.sql, keyed off the
-- `app.customer_id` / `app.staff_id` session GUCs the API server sets
-- via SET LOCAL from a verified JWT at the start of every request
-- transaction (packages/server/src/db.ts#withRole). A bug in the API
-- layer's own checks is still caught here. See docs/ARCHITECTURE.md §13.
--
-- Functions in 005_functions.sql are owned by the migration superuser,
-- so they bypass RLS internally by design — RLS governs ad-hoc queries
-- issued directly by the API layer (mostly SELECTs for read screens),
-- not the atomic write operations, which only ever go through a function.

-- ---- Public catalog: read-only for every authenticated role ----------
grant select on locations, product_categories, products, product_availability,
  collections, collection_products, rewards, loyalty_programs
  to app_customer, app_staff, app_admin;

-- Admin edits the loyalty program from Lua Admin's Loyalty screen today;
-- menu/rewards/staff CRUD stays read-only this round — see
-- docs/ARCHITECTURE.md "Known limitations".
grant update (is_active, earn_rate_per_currency_unit, points_rounding_strategy,
  min_order_amount_minor_units, birthday_bonus_points, points_expire_after_days, tiers, updated_at)
  on loyalty_programs to app_admin;

alter table loyalty_programs enable row level security;
create policy loyalty_programs_read on loyalty_programs for select using (true);
create policy loyalty_programs_admin_write on loyalty_programs for update
  using (true) with check (true);
-- (app_customer/app_staff have no UPDATE grant, so the write policy only
-- ever matters for app_admin regardless of USING here.)

-- ---- customer_profiles -------------------------------------------------
-- Staff never gets a grant on this table at all — they only ever see a
-- customer through resolve_qr_token()'s minimal DTO (docs/ARCHITECTURE.md §6).
alter table customer_profiles enable row level security;

grant select, update (first_name, last_name, phone, birth_date, preferred_locale, home_location_id, favorite_product_ids, marketing_opt_in)
  on customer_profiles to app_customer;
grant select on customer_profiles to app_admin;

create policy customer_profiles_self_select on customer_profiles for select
  to app_customer using (id = nullif(current_setting('app.customer_id', true), '')::uuid);
create policy customer_profiles_self_update on customer_profiles for update
  to app_customer using (id = nullif(current_setting('app.customer_id', true), '')::uuid);
create policy customer_profiles_admin_select on customer_profiles for select
  to app_admin using (true);

-- ---- staff_profiles ------------------------------------------------------
alter table staff_profiles enable row level security;
grant select on staff_profiles to app_staff, app_admin;

create policy staff_profiles_self_select on staff_profiles for select
  to app_staff using (id = nullif(current_setting('app.staff_id', true), '')::uuid);
create policy staff_profiles_admin_select on staff_profiles for select
  to app_admin using (true);

-- ---- orders / order_items ------------------------------------------------
alter table orders enable row level security;
alter table order_items enable row level security;

grant select on orders, order_items to app_customer, app_staff, app_admin;

create policy orders_customer_own on orders for select
  to app_customer using (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid);
create policy orders_staff_open_or_own on orders for select
  to app_staff using (
    status = 'PAID_UNASSIGNED'
    or staff_user_id = nullif(current_setting('app.staff_id', true), '')::uuid
  );
create policy orders_admin_all on orders for select
  to app_admin using (true);

create policy order_items_customer_own on order_items for select
  to app_customer using (
    exists (
      select 1 from orders o where o.id = order_items.order_id
      and o.customer_id = nullif(current_setting('app.customer_id', true), '')::uuid
    )
  );
create policy order_items_staff_visible_orders on order_items for select
  to app_staff using (
    exists (
      select 1 from orders o where o.id = order_items.order_id
      and (o.status = 'PAID_UNASSIGNED' or o.staff_user_id = nullif(current_setting('app.staff_id', true), '')::uuid)
    )
  );
create policy order_items_admin_all on order_items for select
  to app_admin using (true);

-- ---- loyalty_transactions --------------------------------------------
-- No app_staff grant at all: staff only ever learns a balance through
-- resolve_qr_token()'s aggregate, never the raw ledger.
alter table loyalty_transactions enable row level security;
grant select on loyalty_transactions to app_customer, app_admin;

create policy loyalty_transactions_customer_own on loyalty_transactions for select
  to app_customer using (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid);
create policy loyalty_transactions_admin_all on loyalty_transactions for select
  to app_admin using (true);

-- ---- reward_redemptions -----------------------------------------------
alter table reward_redemptions enable row level security;
grant select on reward_redemptions to app_customer, app_admin;

create policy reward_redemptions_customer_own on reward_redemptions for select
  to app_customer using (customer_id = nullif(current_setting('app.customer_id', true), '')::uuid);
create policy reward_redemptions_admin_all on reward_redemptions for select
  to app_admin using (true);

-- ---- qr_sessions --------------------------------------------------------
-- Locked down entirely: nobody gets a direct grant. Issuing, resolving
-- and consuming a session all go through the SECURITY DEFINER functions
-- above, which bypass RLS as the table owner.
alter table qr_sessions enable row level security;

-- ---- audit_logs -----------------------------------------------------------
alter table audit_logs enable row level security;
grant select on audit_logs to app_admin;
create policy audit_logs_admin_only on audit_logs for select
  to app_admin using (true);
