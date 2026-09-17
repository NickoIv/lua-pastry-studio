-- Simplified staff accounts: PIN + short staff code instead of a real
-- email/password, so the business isn't forced to hand out individual
-- work emails to every barista. Email+password (login_staff /
-- login_customer) stays fully intact for OWNER/ADMIN and anyone who
-- already has one — this is additive, not a replacement.
-- See docs/ARCHITECTURE.md "Staff accounts".

alter table staff_profiles alter column email drop not null;
alter table staff_profiles alter column password_hash drop not null;
alter table staff_profiles add column staff_code text unique;
alter table staff_profiles add column pin_hash text;
alter table staff_profiles add constraint staff_profiles_has_login_method
  check (
    (email is not null and password_hash is not null)
    or (staff_code is not null and pin_hash is not null)
  );

-- Backfill a staff_code for existing (email-based) demo accounts too,
-- purely so they're consistent in Admin's staff list — they keep
-- logging in with email+password, staff_code is just informational
-- for them.
update staff_profiles set staff_code = upper(right(replace(id::text, '-', ''), 8))
  where staff_code is null;
alter table staff_profiles alter column staff_code set not null;

create or replace function login_staff_by_code(p_staff_code text, p_pin text)
returns table (id uuid, display_name text, role text, location_id uuid, active boolean)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, display_name, role, location_id, active
  from staff_profiles
  where staff_code = upper(p_staff_code) and pin_hash is not null
    and pin_hash = crypt(p_pin, pin_hash) and active;
$$;

revoke execute on function login_staff_by_code(text, text) from public;
grant execute on function login_staff_by_code(text, text) to app_server;

-- Replaces 015_staff_management.sql's admin_create_staff_account: the
-- default flow is now PIN + staff code + allowed locations; email/password
-- become optional secondary fields for compatibility (e.g. an ADMIN who
-- wants a real login email). Also fans out into staff_locations directly
-- so a brand-new employee doesn't need a second call to become
-- multi-location. Function name changes (rather than overloading) so
-- every caller is forced to move to the new explicit shape.
create or replace function admin_create_staff_account_v2(
  p_display_name text,
  p_role text,
  p_location_ids uuid[],
  p_primary_location_id uuid,
  p_staff_code text,
  p_pin text default null,
  p_email text default null,
  p_password text default null
) returns table (
  id uuid, email text, display_name text, role text, location_id uuid,
  staff_code text, active boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_role = 'OWNER' then
    raise exception 'OWNER_PROTECTED';
  end if;
  if array_length(p_location_ids, 1) is null or not (p_primary_location_id = any(p_location_ids)) then
    raise exception 'VALIDATION';
  end if;
  if p_pin is null and p_password is null then
    raise exception 'VALIDATION';
  end if;

  insert into staff_profiles (email, password_hash, display_name, role, location_id, staff_code, pin_hash, active)
  values (
    case when p_email is not null then lower(p_email) else null end,
    case when p_password is not null then crypt(p_password, gen_salt('bf', 10)) else null end,
    p_display_name, p_role, p_primary_location_id, upper(p_staff_code),
    case when p_pin is not null then crypt(p_pin, gen_salt('bf', 10)) else null end,
    true
  )
  returning staff_profiles.id into v_id;

  insert into staff_locations (staff_id, location_id)
    select v_id, unnest(p_location_ids);

  return query
    select staff_profiles.id, staff_profiles.email, staff_profiles.display_name,
      staff_profiles.role, staff_profiles.location_id, staff_profiles.staff_code,
      staff_profiles.active, staff_profiles.created_at
    from staff_profiles where staff_profiles.id = v_id;
end;
$$;

create or replace function admin_reset_staff_pin(p_staff_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  select role into v_role from staff_profiles where id = p_staff_id;
  if v_role is null then
    raise exception 'STAFF_NOT_FOUND';
  end if;
  if v_role = 'OWNER' then
    raise exception 'OWNER_PROTECTED';
  end if;
  update staff_profiles set pin_hash = crypt(p_pin, gen_salt('bf', 10)) where id = p_staff_id;
end;
$$;

revoke execute on function admin_create_staff_account_v2(text, text, uuid[], uuid, text, text, text, text) from public;
revoke execute on function admin_reset_staff_pin(uuid, text) from public;
grant execute on function admin_create_staff_account_v2(text, text, uuid[], uuid, text, text, text, text) to app_admin;
grant execute on function admin_reset_staff_pin(uuid, text) to app_admin;

-- admin_update_staff_account (015) never touched password_hash/email
-- so it's unaffected by either column going nullable.
