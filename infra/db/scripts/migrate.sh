#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"

MIGRATIONS_DIR="$LUA_DB_ROOT/migrations"

psql -v ON_ERROR_STOP=1 -d "$PGDATABASE" -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
" >/dev/null

for file in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$file")"
  already=$(psql -d "$PGDATABASE" -tAc "SELECT 1 FROM schema_migrations WHERE filename = '$name'")
  if [ "$already" = "1" ]; then
    continue
  fi
  echo "[db:migrate] applying $name"
  psql -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f "$file"
  psql -d "$PGDATABASE" -c "INSERT INTO schema_migrations (filename) VALUES ('$name')" >/dev/null
done

echo "[db:migrate] up to date"
