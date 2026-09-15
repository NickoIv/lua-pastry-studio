-- Staff still gets no grant on the raw customer ledger in general (they
-- learn a balance only through resolve_qr_token's aggregate), but their
-- OWN shift log — the operations they personally performed — is a
-- reasonable, narrow thing for Lua Staff's Shift Log screen to read
-- directly. This is strictly narrower than "read loyalty_transactions".
grant select on loyalty_transactions to app_staff;

create policy loyalty_transactions_staff_own_actions on loyalty_transactions for select
  to app_staff using (performed_by_staff_id = nullif(current_setting('app.staff_id', true), '')::uuid);
