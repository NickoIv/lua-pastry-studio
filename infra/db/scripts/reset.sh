#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"
DIR="$(dirname "${BASH_SOURCE[0]}")"

"$DIR/stop.sh" || true
echo "[db:reset] removing $PGDATA"
rm -rf "$PGDATA"
"$DIR/start.sh"
"$DIR/migrate.sh"
"$DIR/seed.sh"
echo "[db:reset] fresh database ready"
