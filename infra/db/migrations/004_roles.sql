-- DB-level role model. The Node API server never connects as the
-- cluster superuser: it logs in as app_server and SETs LOCAL ROLE to
-- one of the three "session" roles below for the lifetime of each
-- request's transaction, based on a verified JWT — never a
-- client-supplied header. RLS policies (see 006_rls.sql) are written
-- against these roles, so a bug in the API layer's own authorization
-- checks is still caught by Postgres itself.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_customer') then
    create role app_customer nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_staff') then
    create role app_staff nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_admin') then
    create role app_admin nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_server') then
    create role app_server login;
  end if;
end
$$;

grant app_customer to app_server;
grant app_staff to app_server;
grant app_admin to app_server;

grant usage on schema public to app_customer, app_staff, app_admin;
