#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../env.sh"
DIR="$(dirname "${BASH_SOURCE[0]}")"

# Same end state as reset.sh (fresh seeded data) but without tearing
# down the Postgres process itself — a full stop/reinit invalidates
# every open connection (the API server's pool included), which is fine
# for a developer's manual reset but wrong for a test suite's
# beforeAll. This just empties every data table and re-seeds.
psql -v ON_ERROR_STOP=1 -d "$PGDATABASE" -c "
  truncate table
    qr_sessions, audit_logs, loyalty_transactions, reward_redemptions,
    order_items, orders, rewards, collection_products, collections,
    product_availability, products, product_categories,
    customer_profiles, staff_profiles, locations
  restart identity cascade;
" >/dev/null

"$DIR/seed.sh" >/dev/null
echo "[db:wipe] fresh seeded data ready"
