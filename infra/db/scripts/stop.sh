#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"

if [ ! -d "$PGDATA" ] || ! pg_ctl status >/dev/null 2>&1; then
  echo "[db:stop] not running"
  exit 0
fi

pg_ctl -D "$PGDATA" stop -m fast
echo "[db:stop] stopped"
