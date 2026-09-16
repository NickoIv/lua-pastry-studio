-- Customer management for Lua Admin: name/birthday correction, and an
-- efficient list aggregate (balance/order count/lifetime spend/last
-- visit computed in one query, not N+1 — see docs/ARCHITECTURE.md
-- "Customer management").
--
-- Deliberately NOT granted: phone/email. Customer identity stays keyed
-- on customer_profiles.id, never on phone/email — see "Phone change
-- foundation" in docs/ARCHITECTURE.md. Changing contact details safely
-- (verification, uniqueness, notifying the customer) is a later phone/
-- email-change flow, not part of this round.
grant update (first_name, last_name, birth_date) on customer_profiles to app_admin;
create policy customer_profiles_admin_update on customer_profiles for update
  to app_admin using (true) with check (true);

-- The existing single-column indexes (orders.customer_id,
-- loyalty_transactions.customer_id) don't help a "most recent N for
-- this customer" query use an index-only scan for the sort — add the
-- composite the customer detail screen's queries actually run.
create index orders_customer_id_created_at_idx on orders (customer_id, created_at desc);
create index loyalty_transactions_customer_id_created_at_idx on loyalty_transactions (customer_id, created_at desc);

-- Audit Log UI always sorts newest-first and usually filters by a date
-- range — the one index that pays for itself immediately.
create index audit_logs_created_at_idx on audit_logs (created_at desc);

-- One aggregate query for the customer list instead of the API layer
-- looping per row. `orders` counts/sums COMPLETED only, matching how
-- the Admin dashboard already defines "spend" (packages/server/src/routes/admin.ts).
-- security_invoker so this view is subject to RLS as the *querying*
-- role (app_admin), not silently bypassed via the view owner's
-- privileges (the default before Postgres 15's security_invoker option
-- existed) — belt-and-suspenders, since app_admin's own policies on
-- these three tables already grant it full visibility either way.
create view admin_customer_summary
with (security_invoker = true)
as
select
  cp.id,
  coalesce(lb.balance, 0)::integer as points_balance,
  coalesce(os.orders_count, 0)::integer as orders_count,
  coalesce(os.lifetime_spend_minor_units, 0)::integer as lifetime_spend_minor_units,
  os.last_order_at
from customer_profiles cp
left join (
  select customer_id, sum(points) as balance
  from loyalty_transactions
  group by customer_id
) lb on lb.customer_id = cp.id
left join (
  select customer_id, count(*) as orders_count,
    sum(total_minor_units) as lifetime_spend_minor_units, max(created_at) as last_order_at
  from orders
  where status = 'COMPLETED'
  group by customer_id
) os on os.customer_id = cp.id;

grant select on admin_customer_summary to app_admin;
