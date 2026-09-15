#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"

"$(dirname "${BASH_SOURCE[0]}")/init.sh"

if pg_ctl status >/dev/null 2>&1; then
  echo "[db:start] already running on port $PGPORT"
  exit 0
fi

echo "[db:start] starting postgres on port $PGPORT"
pg_ctl -D "$PGDATA" -l "$LUA_DB_ROOT/postgres.log" start

for _ in $(seq 1 30); do
  if pg_isready -q; then
    break
  fi
  sleep 0.3
done

if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE'" | grep -q 1; then
  echo "[db:start] creating database $PGDATABASE"
  createdb "$PGDATABASE"
fi

echo "[db:start] ready at postgres://$PGUSER@$PGHOST:$PGPORT/$PGDATABASE"
