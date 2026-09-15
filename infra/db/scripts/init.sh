#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"

if [ -d "$PGDATA" ]; then
  echo "[db:init] $PGDATA already exists, skipping initdb"
  exit 0
fi

echo "[db:init] initializing cluster at $PGDATA (port $PGPORT)"
initdb --locale=en_US.UTF-8 -E UTF-8 -U "$PGUSER" -A trust --auth-host=trust --auth-local=trust "$PGDATA" >/dev/null
echo "listen_addresses = 'localhost'" >> "$PGDATA/postgresql.conf"
echo "port = $PGPORT" >> "$PGDATA/postgresql.conf"
echo "[db:init] done"
