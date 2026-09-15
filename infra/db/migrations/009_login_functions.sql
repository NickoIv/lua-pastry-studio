-- Replaces 005's verify_*_login helpers: password comparison now happens
-- entirely inside Postgres via pgcrypto's crypt(), so a bcrypt hash never
-- has to leave the database and the API server never handles raw hashes.

drop function if exists verify_customer_login(text);
drop function if exists verify_staff_login(text);

create or replace function login_customer(p_email text, p_password text)
returns table (id uuid, first_name text, last_name text, phone text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, first_name, last_name, phone
  from customer_profiles
  where email = lower(p_email) and password_hash = crypt(p_password, password_hash);
$$;

create or replace function login_staff(p_email text, p_password text)
returns table (id uuid, display_name text, role text, location_id uuid, active boolean)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, display_name, role, location_id, active
  from staff_profiles
  where email = lower(p_email) and password_hash = crypt(p_password, password_hash) and active;
$$;

revoke execute on function login_customer(text, text) from public;
revoke execute on function login_staff(text, text) from public;
grant execute on function login_customer(text, text) to app_server;
grant execute on function login_staff(text, text) to app_server;
