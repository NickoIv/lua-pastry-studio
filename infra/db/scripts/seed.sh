#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"

echo "[db:seed] loading seed data (idempotent)"
psql -v ON_ERROR_STOP=1 -d "$PGDATABASE" -f "$LUA_DB_ROOT/seed.sql"
echo "[db:seed] done"
