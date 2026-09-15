-- ADMIN/OWNER staff accounts should be able to do everything a BARISTA
-- can (scan a QR themselves, confirm an operation) plus their own
-- broader admin grants — so app_admin inherits every app_staff grant
-- instead of duplicating them.
grant app_staff to app_admin;
