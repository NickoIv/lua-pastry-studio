-- Real staff account management for Lua Admin. Staff creation and
-- role/active changes go through SECURITY DEFINER functions (not a
-- plain grant + UPDATE like the catalog CMS) for two reasons: (1) a
-- plaintext password must be hashed with crypt() before it's ever
-- written, exactly like login_staff/login_customer in
-- 009_login_functions.sql, and (2) the OWNER-protection invariant
-- (an ADMIN can never create, promote to, demote, deactivate, or
-- otherwise touch an OWNER account) needs to be enforced somewhere an
-- API-layer bug can't bypass — see docs/ARCHITECTURE.md "Staff
-- management & OWNER protection".

create index staff_profiles_role_active_idx on staff_profiles (role, active);

create or replace function admin_create_staff_account(
  p_email text,
  p_password text,
  p_display_name text,
  p_role text,
  p_location_id uuid
) returns table (
  id uuid, email text, display_name text, role text, location_id uuid,
  active boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_role = 'OWNER' then
    raise exception 'OWNER_PROTECTED';
  end if;

  return query
    insert into staff_profiles (email, password_hash, display_name, role, location_id, active)
    values (lower(p_email), crypt(p_password, gen_salt('bf', 10)), p_display_name, p_role, p_location_id, true)
    returning staff_profiles.id, staff_profiles.email, staff_profiles.display_name,
      staff_profiles.role, staff_profiles.location_id, staff_profiles.active, staff_profiles.created_at;
end;
$$;

-- Single function for display-name/role/active/location edits — every
-- caller goes through the same OWNER guard regardless of which field
-- they're touching, so there's exactly one place that invariant lives.
create or replace function admin_update_staff_account(
  p_staff_id uuid,
  p_display_name text default null,
  p_role text default null,
  p_active boolean default null,
  p_location_id uuid default null
) returns table (
  id uuid, email text, display_name text, role text, location_id uuid,
  active boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_role text;
begin
  -- staff_profiles.role must stay qualified: this function's own
  -- RETURNS TABLE(..., role text, ...) implicitly declares a `role`
  -- OUT-parameter variable in scope for the whole body, so a bare
  -- `role` here is ambiguous between that and the table column.
  select staff_profiles.role into v_current_role from staff_profiles where staff_profiles.id = p_staff_id;
  if v_current_role is null then
    raise exception 'STAFF_NOT_FOUND';
  end if;
  if v_current_role = 'OWNER' or p_role = 'OWNER' then
    raise exception 'OWNER_PROTECTED';
  end if;

  -- Same OUT-parameter shadowing as the select above — every
  -- right-hand-side column reference must stay qualified too.
  update staff_profiles set
    display_name = coalesce(p_display_name, staff_profiles.display_name),
    role = coalesce(p_role, staff_profiles.role),
    active = coalesce(p_active, staff_profiles.active),
    location_id = coalesce(p_location_id, staff_profiles.location_id)
  where staff_profiles.id = p_staff_id;

  return query
    select staff_profiles.id, staff_profiles.email, staff_profiles.display_name,
      staff_profiles.role, staff_profiles.location_id, staff_profiles.active, staff_profiles.created_at
    from staff_profiles where staff_profiles.id = p_staff_id;
end;
$$;

revoke execute on function admin_create_staff_account(text, text, text, text, uuid) from public;
revoke execute on function admin_update_staff_account(uuid, text, text, boolean, uuid) from public;
grant execute on function admin_create_staff_account(text, text, text, text, uuid) to app_admin;
grant execute on function admin_update_staff_account(uuid, text, text, boolean, uuid) to app_admin;
