# Local backend — setup & operation

This is the step-by-step guide for running Lua Guest/Staff/Admin against
the real local backend (`packages/server` + a local Postgres) instead of
the in-memory mock. Everything here is **local-only** — there is no
production deployment story. See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
for why this exists and what it does and doesn't guarantee.

## 0. Quick start — one command

```bash
pnpm demo:doctor   # optional preflight check, changes nothing
pnpm demo:start    # starts Postgres + API + Guest + Staff + Admin
pnpm demo:stop     # stops everything it started
pnpm demo:reset    # wipes and reseeds demo data (Николай back to 3,288 pts)
```

`scripts/demo/*.mjs` implements this — it's a thin orchestrator over the
exact same `infra/db/scripts/*.sh` and `pnpm dev:*` commands described
step-by-step below, plus port/health checks, PID tracking (so
`demo:stop` never touches a process it didn't start), and Mac LAN-IP
detection for phone testing. `Start Lua.command`/`Stop Lua.command` at
the repo root do the same thing for double-clicking from Finder. A
non-developer walkthrough (no terminal knowledge assumed beyond typing
one command) lives in
[`docs/TEST-LUA-LOCALLY.md`](TEST-LUA-LOCALLY.md). Everything from here
down is the manual, step-by-step version of the same thing — useful for
understanding what's actually happening, or if you want to run one
piece on its own.

## Why not Supabase CLI

The preferred direction for a "local Supabase" stack is `supabase start`,
which provisions Postgres, Auth (GoTrue), PostgREST and Realtime as
Docker containers. This machine has no Docker/Podman/Colima installed,
so that path isn't available without installing new container tooling.
Instead:

- **Postgres** runs as a plain local install (Homebrew `postgresql@16`),
  in its own project-scoped data directory (`infra/db/pgdata`, on port
  `54329`) — never a machine-wide cluster, never touched by any other
  project.
- **Auth, the HTTP API, and RLS enforcement** are a small Node/Express
  server (`packages/server`) instead of GoTrue/PostgREST. It still does
  real bcrypt-equivalent (pgcrypto `crypt()`) password checks, real JWTs,
  and real Postgres Row Level Security — see §5 below and
  `docs/ARCHITECTURE.md` §6.

If Docker becomes available later, the SQL schema and RLS policies in
`infra/db/migrations` are what a `supabase init` project's migrations
would contain almost unchanged; the main casualty of not having
PostgREST is that `packages/server`'s routes stand in for its
auto-generated REST API.

## 1. Prerequisites

- Node.js ≥ 20, pnpm (`corepack enable` if needed)
- PostgreSQL 16 via Homebrew: `brew install postgresql@16` (only needed
  once — the scripts below never touch any other Postgres install)
- `pnpm install` at the repo root

## 2. Start the database

```bash
pnpm db:start     # initializes infra/db/pgdata on first run, then starts it
pnpm db:migrate   # applies infra/db/migrations/*.sql (idempotent)
pnpm db:seed      # loads infra/db/seed.sql (idempotent, see §4)
```

Or do all three (plus a full wipe) in one step:

```bash
pnpm db:reset
```

`pnpm db:stop` stops the local cluster. All of this is scoped entirely
to `infra/db/pgdata` (gitignored) — deleting that directory and
re-running `db:reset` gets you back to a byte-for-byte fresh state.

## 3. Start the API server

```bash
cp packages/server/.env.example packages/server/.env   # first time only
pnpm dev:server                                          # http://localhost:4000
```

`packages/server/.env` is gitignored. The example's `JWT_SECRET` is a
loud, clearly-labeled placeholder — fine for a database that only ever
runs on your own laptop, but replace it before this server is ever
reachable from anywhere else (see `docs/QR-SECURITY.md`).

Admin's product/collection image uploads land in
`packages/server/uploads/` (gitignored, created automatically on first
upload) and are served back at `http://localhost:4000/media/...`.
Override the location with `MEDIA_UPLOAD_DIR` in `packages/server/.env`
if you want it somewhere else. Deleting that directory just means the
next upload recreates it — nothing else in the repo depends on its
contents.

## 4. Demo accounts

Seeded by `pnpm db:seed` — **local development credentials only**, not
real people's data:

| App               | Email             | Password       | Role          |
| ----------------- | ----------------- | -------------- | ------------- |
| Lua Guest         | `nikolay@lua.dev` | `LuaGuest123!` | customer      |
| Lua Guest         | `aizhan@lua.dev`  | `LuaGuest123!` | customer      |
| Lua Staff         | `aigerim@lua.dev` | `LuaStaff123!` | BARISTA       |
| Lua Staff         | `yerlan@lua.dev`  | `LuaStaff123!` | SHIFT_MANAGER |
| Lua Staff / Admin | `dana@lua.dev`    | `LuaStaff123!` | ADMIN         |
| Lua Staff / Admin | `marat@lua.dev`   | `LuaStaff123!` | OWNER         |

Every new employee an ADMIN/OWNER creates from Lua Admin → Сотрудники
uses a **staff code + PIN** instead of an email/password — no
individual work email required (see `docs/ARCHITECTURE.md` §10c). The
seeded accounts above keep working with email+password (existing
tooling/tests rely on it) and also have a PIN as a second option:

| Staff code | PIN    | Same person as |
| ---------- | ------ | --------------- |
| `AIGERIM`  | `4821` | `aigerim@lua.dev` |
| `YERLAN`   | `1932` | `yerlan@lua.dev` |
| `DANA01`   | `5310` | `dana@lua.dev` |

`marat@lua.dev` is the one seeded OWNER — no Admin-UI path can create,
promote to, demote, or deactivate this account; see
`docs/ARCHITECTURE.md` "Staff management & OWNER protection".

Николай (`nikolay@lua.dev`) starts at exactly **3,288 points** via a
worked ledger (see `infra/db/seed.sql`), matching the product brief's
example. A live, unassigned demo order **LUA-1001** (8,100 ₸ — Капучино +
Круассан миндальный + Маленький принц) is seeded as `PAID_UNASSIGNED`
for the Scenario-A walkthrough below.

**`Local auth != final production phone OTP`.** Guest's real login flow
in production is meant to be phone-number OTP. Email/password here is a
placeholder that exercises the same `AuthRepository`-shaped boundary
(`packages/data-server/src/LuaApiClient.ts`) without building SMS
infrastructure this round — swapping the login screen and
`packages/server/src/routes/auth.ts`'s verification step for OTP later
doesn't change anything else.

## 5. Run the apps against the backend

Each app defaults to `VITE_LUA_DATA_MODE=mock` (no backend needed). To
point one at the real backend:

```bash
VITE_LUA_DATA_MODE=server pnpm dev:guest   # http://localhost:5173
VITE_LUA_DATA_MODE=server pnpm dev:staff   # http://localhost:5174
VITE_LUA_DATA_MODE=server pnpm dev:admin   # http://localhost:5175
```

Or create a `.env.local` inside each `apps/*` directory (gitignored)
with `VITE_LUA_DATA_MODE=server` and `VITE_LUA_API_URL=http://localhost:4000/api`
so you don't have to repeat the env vars — this is what `pnpm e2e` (§8)
expects to already be running.

**Catalog editing (categories/products/availability/collections/rewards)
in Lua Admin only works in server mode** — mock mode has no backend to
persist writes to, so those screens gate their create/edit buttons on
`isServerMode` and show a plain explanation instead of silently
no-op'ing (`apps/admin/src/data/hooks.ts#requireServerMode`).

### Manual walkthrough

**Reward (Scenario B):** sign into Lua Guest as Николай → Lua Club shows
3,288 → tap "Получить за баллы" on Маленький принц → QR screen (balance
still 3,288 — request never touches the ledger) → sign into Lua Staff as
Айгерим → Scan → point the camera at Guest's QR (or, in dev, paste the
token — see §7) → confirm → Guest balance becomes 788.

**Purchase (Scenario A):** Guest → QR tab (identity QR) → Staff scans it
→ Staff picks the open LUA-1001 order → confirms → Guest's Order History
shows the 8,100 ₸ order with +405 points, balance updates accordingly.

## 6. Cross-device testing (a phone + this Mac)

Browser camera APIs require a secure context. `localhost` is a special
case exempted from that requirement; a plain LAN IP (`http://192.168.x.x`)
is **not** — a real iPhone's Safari will refuse camera access on
`http://192.168.x.x` even though it works from `localhost` on the Mac
itself. This repo does not attempt to work around that with a self-signed
certificate or a disabled-security browser flag; the honest options are:

1. **Guest on your phone, Staff on the Mac.** Guest only _displays_ a QR
   image — it never needs the camera — so this direction works over
   plain HTTP on the LAN today.
2. **Both on the same Mac**, in two browser profiles/windows — what the
   automated E2E smoke test in this repo actually does.
3. **A real HTTPS tunnel** (e.g. a `Caddy`/`mkcert` local CA, or a
   tunneling tool) if you specifically need Staff's camera on a second
   physical device. Not set up in this repo — treat it as a follow-up if
   you need it.

To reach the Mac from a phone on the same Wi-Fi, `pnpm demo:start` (§0)
already does everything needed and prints the exact phone URL. Doing it
by hand, or understanding what's happening under the hood:

```bash
# Find your Mac's LAN IP
ipconfig getifaddr en0   # or en1, depending on your network interface

# Each app's vite.config.ts sets `host: true`, so `pnpm dev:guest` (etc.)
# already binds 0.0.0.0, not just localhost — no --host flag needed.
pnpm dev:guest
```

Then open `http://<that-IP>:5173` on the phone. **No `VITE_LUA_API_URL`
override is needed** — `packages/config/src/appConfig.ts#getApiBaseUrl`
derives the API origin from whatever host the page was actually opened
from (`localhost` stays `localhost`; the Mac's LAN IP becomes that same
IP on port 4000), so the same build/config works for both a
Mac-only session and a phone session without touching env vars. Set
`VITE_LUA_API_URL` explicitly only to override this (a non-default API
port, a tunnel, etc).

`packages/server` already binds `0.0.0.0` by default (`HOST` in
`packages/server/.env.example`), so the API side needs no changes. Its
CORS policy (`packages/server/src/corsPolicy.ts`) only allows requests
from `localhost`/a private-LAN address on the three known dev ports
(5173/5174/5175) — not a wide-open `*` — so this works without opening
the API up to arbitrary websites; see that file's tests
(`packages/server/tests/corsPolicy.test.ts`) for the exact rules.

## 7. Dev-only manual QR entry

Lua Staff's Scan screen shows a "Ввести код вручную (только для
разработки)" field whenever the app is built in dev mode
(`import.meta.env.DEV`) — gone in a production build. It exists so a
desktop browser without a second device handy (or an automated test)
can paste a token issued by Lua Guest and drive the same
resolve/confirm code path a real camera scan would.

## 8. Tests

```bash
pnpm test           # packages/domain + packages/utils — no DB needed
pnpm test:server     # starts/migrates/seeds the DB, then packages/server's
                      # integration tests (115 tests against the real Postgres)
pnpm test:all        # both of the above
pnpm verify          # typecheck + lint + test:all + build — the full gate
```

`packages/server`'s tests truncate and reseed the database at the start
of every test file (`infra/db/scripts/wipe.sh` — see
`packages/server/tests/helpers.ts`), so they're safe to run repeatedly
and don't require a manual reset first.

### End-to-end (Playwright)

```bash
pnpm db:reset                                  # start from known-good seed data
pnpm dev:server & pnpm dev:guest & pnpm dev:staff & pnpm dev:admin &
pnpm e2e:install    # once — downloads the Chromium build Playwright drives
pnpm e2e            # runs e2e/*.spec.ts against the four processes above
```

This drives real browser sessions against the real backend — an Admin
product-lifecycle flow through both the Admin and Guest UIs, the reward
price-change snapshot through Guest's real redemption flow, and a
presentation-smoke spec that (re)generates the 8 screenshots in
`artifacts/presentation/`. Because it mutates real ledger/catalog rows
(a requested-and-confirmed reward really does deduct points), run
`pnpm db:wipe` afterward if you want the dev database back to pristine
seed values.

## 9. Troubleshooting

- **`pnpm db:start` hangs / "port already in use"** — something else is
  already listening on 54329. Check `lsof -i :54329`; if it's a stale
  `postgres` process from a previous session, `pnpm db:stop` first.
- **`permission denied for table ...` from the API** — you're likely
  looking at RLS working as intended (see `docs/ARCHITECTURE.md` §6),
  not a bug — check which role the failing query ran as.
- **Guest/Staff/Admin show a blank "Не удалось связаться с сервером"
  error** — the API server isn't running, or `VITE_LUA_API_URL` doesn't
  match where it's listening. `curl http://localhost:4000/health` should
  return `{"ok":true}`.
- **Changed a `.sql` file and it's not taking effect** — migrations are
  tracked by filename in the `schema_migrations` table and only ever run
  once; edit a _new_ migration file, never an already-applied one (same
  rule Supabase/any migration tool follows). For local iteration, `pnpm
db:reset` re-applies everything from scratch.
