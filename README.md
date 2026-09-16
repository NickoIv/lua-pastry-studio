# Lua Platform

Monorepo for **Lua Pastry Studio** — a unified platform with three apps
sharing one domain model, design system, and data layer:

- **Lua Guest** (`apps/guest`) — the client mobile-first PWA: menu, Lua Club
  loyalty, a real scannable personal QR, order history.
- **Lua Staff** (`apps/staff`) — the fast in-store tool for baristas/waiters
  and shift managers: real camera QR scanning, confirm a purchase, hand over a
  points reward.
- **Lua Admin** (`apps/admin`) — the desktop back office: real CRUD for
  categories, products (with local image upload), per-location
  availability, collections, and rewards; loyalty program settings;
  customer management (search, detail, name/birthday edit, manual
  point adjustments); staff management with OWNER-account protection;
  an audit log; orders.

Every app can run two ways, switched with one env var
(`VITE_LUA_DATA_MODE`):

- **`mock`** (default) — an in-memory data layer, zero setup, nothing to
  install beyond `pnpm install`.
- **`server`** — the real local backend: a Postgres database + a small
  Express API (`packages/server`) with real auth, real Row Level
  Security, and real QR tokens. See
  [`docs/LOCAL-BACKEND.md`](docs/LOCAL-BACKEND.md) to set it up.

Both modes go through the exact same screens and hooks — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how that works and
[`docs/QR-SECURITY.md`](docs/QR-SECURITY.md) for the QR token model.

## Requirements

- Node.js ≥ 20
- pnpm (this repo pins `pnpm@12.4.1` via `packageManager`; enable it with
  `corepack enable` if you don't have it)
- PostgreSQL 16 — **only if you want `server` mode**; `mock` mode needs
  nothing beyond Node/pnpm. See `docs/LOCAL-BACKEND.md`.

## Install

```bash
pnpm install
```

## Run an app (mock mode — no setup needed)

```bash
pnpm dev:guest   # http://localhost:5173
pnpm dev:staff   # http://localhost:5174
pnpm dev:admin   # http://localhost:5175
```

Each app can also be started directly: `pnpm --filter @lua/guest dev`.

Demo data is seeded from fixtures — nothing to configure. In Lua Staff,
sign in as any of the three listed staff members; in Lua Guest, the
signed-in guest is always the fixture customer "Николай".

## Run against the real local backend (server mode)

```bash
pnpm db:start && pnpm db:migrate && pnpm db:seed   # once
pnpm dev:server                                      # http://localhost:4000

VITE_LUA_DATA_MODE=server pnpm dev:guest
VITE_LUA_DATA_MODE=server pnpm dev:staff
VITE_LUA_DATA_MODE=server pnpm dev:admin
```

Real demo accounts (email/password), a Guest→QR→Staff→confirm walkthrough
for both loyalty scenarios, and cross-device testing notes are in
[`docs/LOCAL-BACKEND.md`](docs/LOCAL-BACKEND.md).

## Everyday scripts

```bash
pnpm typecheck    # tsc --noEmit across every package/app
pnpm lint         # eslint .
pnpm format       # prettier --write .
pnpm test          # vitest run — packages/domain + packages/utils, no DB needed
pnpm test:server    # starts/migrates/seeds the DB, then packages/server's
                     # 78 integration tests against the real Postgres
pnpm test:all       # both of the above
pnpm build         # typecheck everything, then vite build the three apps
pnpm verify        # typecheck + lint + test:all + build — the full gate
pnpm e2e:install   # once — downloads Playwright's Chromium build
pnpm e2e           # e2e/*.spec.ts against the real backend — see docs/LOCAL-BACKEND.md
```

## Where things live

```
apps/
  guest/         Lua Guest — React + Vite, mobile-first PWA shell
  staff/         Lua Staff — React + Vite, real camera QR scan + confirm flow
  admin/         Lua Admin — React + Vite, sidebar shell + data tables

packages/
  types/         Shared domain types: Customer, Order, LoyaltyTransaction,
                  Money, QRToken, RBAC roles/permissions, API error codes.
  domain/        Loyalty rules, the ledger, the two-phase reward-redemption
                  state machine, repository interfaces, and the MOCK backend.
  data-server/   Typed HTTP client for the REAL backend (packages/server).
  server/        Express API: auth, RLS-aware DB access, atomic loyalty
                  operations, the Admin catalog/staff/customer CMS, a
                  local media upload pipeline, an in-memory rate limiter
                  — packages/server/tests has 78 integration tests.
  ui/            Design system: tokens, base component set, one icon set.
  i18n/          ru/kk/en dictionaries + a React provider/hook.
  utils/         Money formatting, points pluralization, date formatting.
  config/        Runtime config read from Vite env vars (data mode, API URL).

infra/db/        Postgres schema, RLS policies, atomic SQL functions, seed
                  data, and the init/start/stop/migrate/seed/reset scripts.

docs/
  ARCHITECTURE.md    High-level architecture, both data layers, RBAC.
  LOCAL-BACKEND.md   How to run and use the real local backend.
  QR-SECURITY.md     The QR token model in detail.
```

Mock data lives in [`packages/domain/src/mock/fixtures.ts`](packages/domain/src/mock/fixtures.ts);
the real backend's equivalent seed is [`infra/db/seed.sql`](infra/db/seed.sql)
— the server-mode seed has grown to 5 categories, 19 products, 4
rewards, and a seasonal "Book Collection" demo (Маленький принц,
Грозовой перевал, Цветы для Элджернона, Властелин колец — original
placeholder copy for this demo, not real Lua Pastry Studio marketing
text). Both fixtures describe the same Almaty café and the same demo
customer whose ledger lands on exactly 3,288 points, matching the
product brief's example.

## Production backend

Not deployed anywhere — everything above is strictly local. See
[`docs/LOCAL-BACKEND.md`](docs/LOCAL-BACKEND.md) for why this repo runs
a plain local Postgres + a small Express API instead of `supabase start`
(no Docker on this dev machine), and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §10 for what a Supabase
migration would carry over unchanged.
