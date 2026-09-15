# Lua Platform

Foundation monorepo for **Lua Pastry Studio** — a unified platform with three
apps sharing one domain model, design system and data layer:

- **Lua Guest** (`apps/guest`) — the client mobile-first PWA: menu, Lua Club
  loyalty, personal QR, order history.
- **Lua Staff** (`apps/staff`) — the fast in-store tool for baristas/waiters
  and shift managers: scan a guest's QR, confirm a purchase, hand over a
  points reward.
- **Lua Admin** (`apps/admin`) — the desktop back office: menu, rewards,
  loyalty program settings, customers, orders, staff, analytics.

No production backend is connected yet. Every app runs against an in-memory
mock data layer (`packages/domain/src/mock`) built behind the same
repository interfaces a real backend would implement — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how that swap happens
later without touching UI code.

## Requirements

- Node.js ≥ 20
- pnpm (this repo pins `pnpm@12.4.1` via `packageManager`; enable it with
  `corepack enable` if you don't have it)

## Install

```bash
pnpm install
```

## Run an app

```bash
pnpm dev:guest   # http://localhost:5173
pnpm dev:staff   # http://localhost:5174
pnpm dev:admin   # http://localhost:5175
```

Each app can also be started directly: `pnpm --filter @lua/guest dev`.

Demo credentials/data are all seeded from fixtures — nothing to configure to
try any of the three apps. In Lua Staff, sign in as any of the three listed
staff members; in Lua Guest, the signed-in guest is always the fixture
customer "Николай" (see [Known limitations](docs/ARCHITECTURE.md)).

## Everyday scripts

```bash
pnpm typecheck   # tsc --noEmit across every package/app
pnpm lint        # eslint .
pnpm format      # prettier --write .
pnpm test        # vitest run, for packages/domain and packages/utils
pnpm build       # typecheck everything, then vite build the three apps
```

## Where things live

```
apps/
  guest/        Lua Guest — React + Vite, mobile-first PWA shell
  staff/        Lua Staff — React + Vite, role login + scan/confirm flow
  admin/        Lua Admin — React + Vite, sidebar shell + data tables

packages/
  types/        Shared domain types: Customer, Order, LoyaltyTransaction,
                 Money, QRToken, RBAC roles/permissions, etc. No logic.
  domain/       Business logic: loyalty earn/redeem rules, the ledger,
                 the two-phase reward-redemption state machine, repository
                 interfaces, and the mock backend implementing them.
  ui/           Design system: tokens (colors/type/spacing/motion), the
                 base component set (Button, Card, BottomNavigation, Money,
                 Points, Sheet, EmptyState, Skeleton, …), and one shared
                 line-icon set.
  i18n/         ru/kk/en dictionaries + a React provider/hook. ru is the
                 primary language; kk and en cover the app chrome today.
  utils/        Presentation-adjacent pure helpers: KZT money formatting,
                 points pluralization (ru), date formatting.
  config/       Runtime config read from Vite env vars (data mode, QR TTL).

docs/
  ARCHITECTURE.md   High-level architecture, QR security plan, loyalty
                     ledger design, RBAC, and what's deliberately deferred.
```

Mock data lives in [`packages/domain/src/mock/fixtures.ts`](packages/domain/src/mock/fixtures.ts) —
realistic Almaty café data (two locations, an eight-item menu, three
rewards, and a fully worked loyalty ledger for the demo customer whose
balance lands on 3,288 points, matching the product brief's example).

Domain/business logic — the part with real invariants to protect — lives in
[`packages/domain/src/loyalty`](packages/domain/src/loyalty) and is covered
by the tests in `packages/domain/tests`.

## Production backend

Not connected, on purpose — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the plan (Supabase/Postgres is the intended target) and why the mock
repository layer makes that swap safe to do later.
