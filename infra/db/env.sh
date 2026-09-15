#!/usr/bin/env bash
# Shared settings for every infra/db/scripts/*.sh — sourced, not executed.
# Everything here is scoped to this project's own local dev Postgres
# cluster (its own data directory, its own port); it never touches a
# machine-wide Postgres install or any other project's data.

set -euo pipefail

LUA_DB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export LUA_DB_ROOT

export PGDATA="$LUA_DB_ROOT/pgdata"
export PGPORT="${LUA_PG_PORT:-54329}"
export PGHOST="127.0.0.1"
export PGDATABASE="lua"
export PGUSER="${USER}"

PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
if [ ! -d "$PG_BIN" ]; then
  PG_BIN="/usr/local/opt/postgresql@16/bin"
fi
export PATH="$PG_BIN:$PATH"
