-- 005's mask_phone took the first 3 raw digits (which for a KZT number
-- is just "7" + the first two digits of the operator code, not a
-- meaningful prefix) — show the country code and mask the rest instead.
create or replace function mask_phone(p_phone text) returns text
language sql
immutable
as $$
  select '+' || left(regexp_replace(p_phone, '\D', '', 'g'), 1)
    || ' •• •• ' || right(regexp_replace(p_phone, '\D', '', 'g'), 2);
$$;
