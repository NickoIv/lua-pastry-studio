-- Admin catalog CMS write access. Mirrors the loyalty_programs_admin_write
-- shape from 006_rls.sql: app_admin gets an explicit grant + a
-- permissive RLS policy scoped to that role only — nobody else (not
-- even app_staff, despite inheriting most app_admin... wait, the
-- inheritance direction is app_admin -> app_staff, so this is safe:
-- BARISTA/WAITER/SHIFT_MANAGER never get these grants).
--
-- Products and rewards intentionally get NO delete grant at all — orders,
-- reward_redemptions and loyalty_transactions can reference them, so the
-- only supported way to retire one is `active = false` (archive), never
-- a hard delete. Categories and collections may be hard-deleted (no
-- ledger/order history depends on them directly); a category still
-- referenced by a product is protected by the existing foreign key
-- (products.category_id has no ON DELETE clause, i.e. RESTRICT) — the
-- API layer maps that into a friendly CATEGORY_IN_USE error instead of
-- a raw constraint violation.

grant insert, update on product_categories to app_admin;
grant delete on product_categories to app_admin;
create policy product_categories_admin_write on product_categories for insert to app_admin with check (true);
create policy product_categories_admin_update on product_categories for update to app_admin using (true) with check (true);
create policy product_categories_admin_delete on product_categories for delete to app_admin using (true);

grant insert, update on products to app_admin;
create policy products_admin_write on products for insert to app_admin with check (true);
create policy products_admin_update on products for update to app_admin using (true) with check (true);

grant insert, update, delete on product_availability to app_admin;
create policy product_availability_admin_write on product_availability for insert to app_admin with check (true);
create policy product_availability_admin_update on product_availability for update to app_admin using (true) with check (true);
create policy product_availability_admin_delete on product_availability for delete to app_admin using (true);
-- Staff needs to read availability rows for the menu they serve from —
-- already covered by the blanket catalog SELECT grant in 006_rls.sql.

grant insert, update, delete on collections, collection_products to app_admin;
create policy collections_admin_write on collections for insert to app_admin with check (true);
create policy collections_admin_update on collections for update to app_admin using (true) with check (true);
create policy collections_admin_delete on collections for delete to app_admin using (true);
create policy collection_products_admin_write on collection_products for insert to app_admin with check (true);
create policy collection_products_admin_delete on collection_products for delete to app_admin using (true);

grant insert, update on rewards to app_admin;
create policy rewards_admin_write on rewards for insert to app_admin with check (true);
create policy rewards_admin_update on rewards for update to app_admin using (true) with check (true);

-- RLS was already enabled on collections/collection_products/product_availability
-- as part of the tables' base setup? No — 001_core_catalog.sql never
-- enabled RLS on these (only 006_rls.sql's explicit list did, and it
-- didn't include collections/collection_products/product_availability
-- since they were read-only-to-everyone at the time). Enable it now so
-- the admin-only write policies above actually take effect.
alter table product_categories enable row level security;
alter table product_availability enable row level security;
alter table collections enable row level security;
alter table collection_products enable row level security;

-- These tables are still meant to be readable by everyone signed in —
-- re-declare the same permissive read policy 006_rls.sql relied on
-- (implicit prior to RLS being enabled) now that RLS is on.
create policy product_categories_read on product_categories for select using (true);
create policy product_availability_read on product_availability for select using (true);
create policy collections_read on collections for select using (true);
create policy collection_products_read on collection_products for select using (true);

-- products/rewards already had RLS enabled? No — same gap. Fix it here
-- too, since these are the two most important catalog tables.
alter table products enable row level security;
alter table rewards enable row level security;
create policy products_read on products for select using (true);
create policy rewards_read on rewards for select using (true);

-- Admin's catalog writes are audit-logged from the API layer
-- (packages/server/src/routes/adminCatalog.ts) — grant the INSERT it needs.
grant insert on audit_logs to app_admin;
create policy audit_logs_admin_insert on audit_logs for insert to app_admin with check (true);
