-- QR TTL becomes a real, Admin-editable setting instead of a frontend
-- env var — see docs/ARCHITECTURE.md §16 and the Lua Admin Settings screen.
alter table loyalty_programs add column qr_token_ttl_seconds integer not null default 90
  check (qr_token_ttl_seconds between 30 and 300);

grant update (qr_token_ttl_seconds) on loyalty_programs to app_admin;
