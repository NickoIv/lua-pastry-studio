-- Real location management + staff multi-location support (owner testing
-- surfaced both as missing: locations were effectively hardcoded seed
-- data, and one staff member could only ever belong to one location).
-- See docs/ARCHITECTURE.md "Locations & staff multi-location".

alter table locations
  add column short_name text,
  add column sort_order integer not null default 0;

-- Backfill a short name for existing rows so nothing renders blank —
-- takes whatever follows the last " — " in the full name, else the
-- full name itself.
update locations set short_name = coalesce(nullif(split_part(name, ' — ', 2), ''), name)
  where short_name is null;
alter table locations alter column short_name set not null;

-- ---- Staff multi-location ------------------------------------------------
-- staff_profiles.location_id remains each staff member's PRIMARY
-- location (used for the JWT session claim and anywhere exactly one
-- location is needed) — unchanged in meaning, just no longer their only
-- one. staff_locations is the additive many-to-many for "which
-- locations can this person work at".
create table staff_locations (
  staff_id uuid not null references staff_profiles(id) on delete cascade,
  location_id uuid not null references locations(id),
  primary key (staff_id, location_id)
);

insert into staff_locations (staff_id, location_id)
select id, location_id from staff_profiles
on conflict do nothing;

create index staff_locations_location_id_idx on staff_locations (location_id);

grant select on staff_locations to app_staff, app_admin;
alter table staff_locations enable row level security;
create policy staff_locations_self_select on staff_locations for select
  to app_staff using (staff_id = nullif(current_setting('app.staff_id', true), '')::uuid);
create policy staff_locations_admin_all on staff_locations for select
  to app_admin using (true);

grant select, insert, update, delete on locations to app_admin;
alter table locations enable row level security;
create policy locations_admin_all on locations for all
  to app_admin using (true) with check (true);
-- app_customer/app_staff already read locations via the 006_rls.sql
-- catalog grant+no-RLS-table combination; enabling RLS here means they
-- now need an explicit read policy too.
create policy locations_read_all on locations for select
  to app_customer, app_staff using (true);

-- Every staff write (create/update, incl. the allowed-locations set)
-- goes through SECURITY DEFINER functions, same rationale as
-- 015_staff_management.sql: OWNER-protection and the staff_locations
-- fan-out must live somewhere an API bug can't bypass.
create or replace function admin_create_location(
  p_name text, p_short_name text, p_address text, p_city text,
  p_phone text, p_open_hours text, p_sort_order integer
) returns locations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row locations;
begin
  insert into locations (name, short_name, address, city, phone, open_hours, sort_order, is_active)
  values (p_name, p_short_name, p_address, p_city, p_phone, p_open_hours, coalesce(p_sort_order, 0), true)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function admin_update_location(
  p_id uuid, p_name text default null, p_short_name text default null,
  p_address text default null, p_city text default null, p_phone text default null,
  p_open_hours text default null, p_sort_order integer default null, p_is_active boolean default null
) returns locations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row locations;
begin
  update locations set
    name = coalesce(p_name, locations.name),
    short_name = coalesce(p_short_name, locations.short_name),
    address = coalesce(p_address, locations.address),
    city = coalesce(p_city, locations.city),
    phone = coalesce(p_phone, locations.phone),
    open_hours = coalesce(p_open_hours, locations.open_hours),
    sort_order = coalesce(p_sort_order, locations.sort_order),
    is_active = coalesce(p_is_active, locations.is_active)
  where locations.id = p_id
  returning * into v_row;
  if v_row.id is null then
    raise exception 'LOCATION_NOT_FOUND';
  end if;
  return v_row;
end;
$$;

/** Replaces the full allowed-locations set for a staff member and keeps location_id (primary) valid within it. */
create or replace function admin_set_staff_locations(
  p_staff_id uuid, p_location_ids uuid[], p_primary_location_id uuid
) returns void
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
  if array_length(p_location_ids, 1) is null or not (p_primary_location_id = any(p_location_ids)) then
    raise exception 'VALIDATION';
  end if;

  delete from staff_locations where staff_id = p_staff_id;
  insert into staff_locations (staff_id, location_id)
    select p_staff_id, unnest(p_location_ids);
  update staff_profiles set location_id = p_primary_location_id where id = p_staff_id;
end;
$$;

revoke execute on function admin_create_location(text, text, text, text, text, text, integer) from public;
revoke execute on function admin_update_location(uuid, text, text, text, text, text, text, integer, boolean) from public;
revoke execute on function admin_set_staff_locations(uuid, uuid[], uuid) from public;
grant execute on function admin_create_location(text, text, text, text, text, text, integer) to app_admin;
grant execute on function admin_update_location(uuid, text, text, text, text, text, text, integer, boolean) to app_admin;
grant execute on function admin_set_staff_locations(uuid, uuid[], uuid) to app_admin;
