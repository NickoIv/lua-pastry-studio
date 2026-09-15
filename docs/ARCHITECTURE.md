# Lua Platform — Architecture

This document explains the shape of this repository: what boundaries
exist, why they're drawn where they are, and what's real today versus
what a production deployment still needs. See
[`docs/LOCAL-BACKEND.md`](LOCAL-BACKEND.md) for how to run the real
backend and [`docs/QR-SECURITY.md`](QR-SECURITY.md) for the QR token
model specifically.

## 1. High-level shape

Three independent Vite/React apps (`apps/guest`, `apps/staff`, `apps/admin`)
share seven packages, plus a real local backend:

```
apps/guest, apps/staff, apps/admin
        │  import
        ▼
packages/ui           — design tokens + components (no business logic)
packages/i18n          — ru/kk/en dictionaries + provider/hook
packages/domain         — loyalty rules, ledger, redemption state machine,
                          repository interfaces, MOCK backend
packages/data-server    — HTTP client + typed DTOs for the REAL backend
packages/utils         — Money/points/date formatting (pure functions)
packages/types         — shared entity types + API error codes, no runtime code
packages/config        — reads Vite env vars into one typed object

packages/server         — Express API (the real backend's HTTP surface)
infra/db                — Postgres schema, RLS policies, atomic SQL
                          functions, seed data (infra/db/migrations, seed.sql)
```

`types` has no dependencies. `domain`, `data-server` and `utils` depend
only on `types`. `ui` depends on `types` and `utils`. Apps depend on all
of the above. Nothing flows backward.

**Two data layers, one contract.** Every app can run in `mock` mode
(`packages/domain`'s in-memory repositories, zero setup) or `server`
mode (`packages/data-server`'s `LuaApiClient` talking to
`packages/server`, backed by a real local Postgres). Each app's
`src/data/hooks.ts` is the _only_ place that branches on
`APP_CONFIG.dataMode` — every screen calls the same hooks
(`useLoyaltyAccount()`, `useOrders()`, …) regardless of which mode is
active. See §8.

## 2. Domain boundaries

`packages/types/src` defines the entities from the product brief:
`Customer`, `CustomerProfile`, `StaffUser`/`Role`/`Permission`,
`Location`, `Product`/`ProductCategory`/`Collection`, `Order`/`OrderItem`,
`LoyaltyAccount`/`LoyaltyTransaction`/`LoyaltyProgram`, `Reward`/
`RewardRedemption`, `QRToken`, `Notification`, `AuditLog`, and (new)
`ApiErrorCode` — the typed error vocabulary the server and every client
share (§9). Every field that represents money is a `Money` value
(`{ currency, minorUnits }`, integer only — see §5), never a float.

`packages/domain/src/repositories` defines the interfaces the _mock_
data layer implements: `CustomerRepository`, `MenuRepository`,
`OrdersRepository`, `LoyaltyRepository`, `RewardsRepository`.
`packages/domain/src/mock` is their only implementation. The real
backend doesn't implement these same TypeScript interfaces —
`packages/data-server`'s `LuaApiClient` has an equivalent-but-not-
identical shape, because the real backend's trust boundary is
fundamentally different (see §4): a mock repository can synchronously
mutate its own in-memory ledger, but the real system requires a
server-verified staff JWT before any ledger write happens at all. Each
app's `data/hooks.ts` is what reconciles the two shapes into one set of
hooks screens call.

`packages/domain/src/loyalty` still holds the reference implementation
of the loyalty rules (`earning.ts`, `ledger.ts`, `earnService.ts`,
`redemption.ts`) used by mock mode, and is covered by
`packages/domain/tests`. The **same rules are re-implemented as
Postgres functions** for server mode (`infra/db/migrations/005_functions.sql`)
— not shared code, because SQL and TypeScript can't share a function
body, but deliberately mirroring the same shape (ledger-derived balance,
two-phase redemption, idempotency keys) and covered by an equivalent
test suite (`packages/server/tests`) that asserts the exact same
numbers.

## 3. Loyalty: earning and redemption

**Ledger, not a counter**, in both data layers. Mock:
`balanceFromLedger()` sums `LoyaltyTransaction.points`. Server: there is
no `customers.balance` column anywhere in `infra/db/migrations` —
`loyalty_transactions` is queried with `sum(points)` every time a
balance is needed (`packages/server/src/routes/loyalty.ts`). Every
transaction/row carries a `type` (`earn` / `redeem` / `refund` /
`manual_adjustment` / `birthday_bonus` / `campaign_bonus` / `expiration`
/ `reversal`), an optional `order_id` / `reward_redemption_id` /
`performed_by_staff_id`, a human `reason`, and an `idempotency_key` so a
retried network call can't double-apply — enforced as a real `unique`
constraint in Postgres, not just an application-level check.

**Scenario A — purchase.** Mock: `EarnService.earnForCompletedOrder`.
Server: the `confirm_order_earn(order_id, customer_id, staff_id)` SQL
function — reads the _current_ `loyalty_programs` row (never a
hard-coded rate), computes points, attaches the order, inserts the
ledger row keyed `earn:<orderId>`, writes an audit log entry, all inside
one transaction. Re-confirming an already-`COMPLETED` order is rejected
(`ORDER_ALREADY_REWARDED`), not double-earned.

**Scenario B — buy with points.** _Choosing_ a reward must never move
points:

1. **Request** (`request_reward_redemption` / mock's
   `RedemptionService.requestRedemption`) — validates the reward is
   active and the balance covers it, creates a `PENDING` redemption.
   **No ledger write.**
2. A QR token is issued for that redemption (`create_qr_session` /
   mock's `issueRewardRedemptionToken`) — see `docs/QR-SECURITY.md`.
3. Staff scans it; **confirm** (`confirm_reward_redemption` / mock's
   `RedemptionService.fulfillRedemption`) re-validates status/expiry/
   balance and _only then_ inserts a `redeem` transaction keyed
   `redemption:<id>`. A second confirm is rejected
   (`REDEMPTION_ALREADY_COMPLETED`), including under concurrent staff
   scans — the SQL function takes a row lock (`for update`) on the
   redemption before checking status, so two simultaneous confirms
   serialize instead of racing (see `docs/QR-SECURITY.md` "Replay /
   race protection").

Both paths are proven against the exact numbers from the product brief
— balance 3,288 → reward costs 2,500 → unchanged after _request_ → 788
after _confirm_ — in **two** independent test suites:
`packages/domain/tests/redemption.test.ts` (mock, in-memory) and
`packages/server/tests/flows.test.ts` (server mode, against the real
Postgres, over real HTTP). A full Playwright run driving actual Guest
and Staff browser sessions against the real backend reproduces the same
numbers end to end — see §11.

**Configurability**, both modes: `LoyaltyProgram` (earn rate, rounding
strategy, minimum order amount, birthday bonus, points expiry, tiers,
and now QR TTL) is read through `getProgram()`/`updateProgram()`
(mock) or `GET/PATCH /api/loyalty/program` and `/api/admin/loyalty/program`
(server) — nothing hard-codes "5%". In server mode, Lua Admin's Loyalty
screen writes to the real `loyalty_programs` row and it persists.

## 4. QR — see docs/QR-SECURITY.md for the full model

Summary: a real backend now exists, so the QR flow is no longer a
same-process simulation. `packages/server` issues a cryptographically
random token, stores only its SHA-256 digest, and Lua Guest renders it
as a genuine camera-decodable QR image (the `qrcode` package — verified
in this repo by round-tripping a rendered code back through `jsQR` in a
test script, not just eyeballed). Lua Staff's Scan screen
(`apps/staff/src/components/QrScanner.tsx`) uses the native
`BarcodeDetector` API where available and a `jsQR` canvas-frame fallback
everywhere else, with a dev-only manual token paste field
(`import.meta.env.DEV`-gated) for desktop testing without a camera.

Mock mode keeps the same two-dev-button "simulate scan" flow from the
previous milestone (`apps/staff/src/routes/ScanScreen.tsx`) for
zero-setup offline demos — see `docs/QR-SECURITY.md` for why a QR issued
by mock-mode Guest still can't be scanned by a different device (each
mock backend instance is process-local; server mode has no such
limitation, since both apps talk to the one real Postgres database).

## 5. Money

`packages/types/src/money.ts`: `Money = { currency: "KZT", minorUnits: number }`,
always an integer, in both TypeScript and Postgres
(`*_minor_units integer` columns throughout `infra/db/migrations`, `check (... >= 0)`
constraints). Display formatting (`packages/utils/src/money.ts`) uses
`Intl.NumberFormat` and is the _only_ place a `Money` becomes a string.
`confirm_order_earn`'s point calculation is done in SQL
(`(total_minor_units / 100.0) * earn_rate`) with the same
floor/round/ceil rounding-strategy switch as the TypeScript reference
implementation — no floating-point money anywhere in either layer.

## 6. RBAC & security — real now, not just typed

`packages/types/src/staff.ts` still defines `Role`/`Permission`/
`ROLE_PERMISSIONS` for client-side gating (e.g. Lua Staff hides the
Shift Log entry point from roles without `shift.view_log`). In server
mode this is backed by actual enforcement, in two independent layers:

1. **API layer** (`packages/server/src/auth/middleware.ts`) —
   `requireCustomer` / `requireStaff` / `requireRole(...)` reject a
   request before it touches the database if the JWT's `kind`/`role`
   doesn't match what the route needs.
2. **Database layer** (`infra/db/migrations/004_roles.sql`,
   `006_rls.sql`, `008_staff_shift_log.sql`) — three Postgres roles
   (`app_customer`, `app_staff`, `app_admin`; `app_admin` inherits
   `app_staff`'s grants) with Row Level Security policies on every
   sensitive table (`customer_profiles`, `orders`, `order_items`,
   `loyalty_transactions`, `reward_redemptions`, `staff_profiles`,
   `audit_logs`, `qr_sessions`). `packages/server/src/db.ts#withRole`
   runs every request inside a transaction that `SET LOCAL ROLE`s to the
   caller's session role and sets `app.customer_id`/`app.staff_id`
   session variables _from the verified JWT_ — so a bug in the API
   layer's own authorization logic is still caught by Postgres itself.
   `packages/server/tests/security.test.ts` asserts this directly (e.g.
   a customer's JWT literally cannot `SELECT` another customer's
   `loyalty_transactions` rows — not "the API declines to return them",
   the database query returns zero rows).

`StaffFacingCustomer` / server's `resolve_qr_token()` DTO both stay the
deliberately reduced view a staff device is allowed to render after a
scan — id, display name, masked phone, balance; no birth date, no email,
no full order history. In server mode, `app_staff` has **no SQL grant
at all** on `customer_profiles` — that data literally cannot be queried
by a staff session, not merely hidden by the UI.

**Still not real:** staff device authentication is email/password
against the same demo accounts as everyone else, not PIN/badge/SSO;
there's no rate limiting; there's no production secrets management. See
`docs/QR-SECURITY.md` "What's real today vs. what production needs".

## 7. i18n

Unchanged from the previous milestone: `packages/i18n` ships flat,
namespaced dictionaries for `ru` (primary), `kk`, and `en`, typed so a
missing key is a compile error. Covers app chrome, not every backend
error message — those go through `API_ERROR_MESSAGES_RU`
(`packages/types/src/apiErrors.ts`) instead, which is Russian-only today
(see Known limitations).

## 8. Repository adapters — mock and server, side by side

Each app's `src/data/hooks.ts` is the single seam between UI and data:

```ts
export function useLoyaltyAccount() {
  const backend = useBackend(); // mock repositories (packages/domain)
  const { session } = useSession(); // server-mode auth state
  return useAsync(async () => {
    if (isServerMode) return apiClient.getMyLoyaltyAccount(); // packages/data-server
    return backend.loyalty.getAccount(CURRENT_CUSTOMER_ID); // packages/domain mock
  }, [backend, session]);
}
```

Screens only ever call `useLoyaltyAccount()` — never `fetch()`, never a
mock class directly. `apps/*/src/data/viewTypes.ts` (Guest) defines the
loose common shape both branches satisfy structurally, so switching
`VITE_LUA_DATA_MODE` doesn't require touching a single route component.
This is the direct descendant of the previous milestone's "mock
repositories behind one `useBackend()` hook" design, extended to a
second, real implementation instead of staying hypothetical.

`packages/data-server/src/LuaApiClient.ts` mirrors `packages/server`'s
REST surface 1:1 (one method per route) and holds the session JWT in
memory, with each app's `SessionProvider` persisting it to
`localStorage` as a per-viewer convenience (not httpOnly-cookie-safe —
fine for local dev, called out as a known limitation).

## 9. API error model

`packages/types/src/apiErrors.ts`'s `ApiErrorCode` union (`QR_EXPIRED`,
`QR_USED`, `QR_INVALID`, `INSUFFICIENT_POINTS`,
`REDEMPTION_ALREADY_COMPLETED`, `ORDER_ALREADY_REWARDED`, `FORBIDDEN`,
`UNAUTHENTICATED`, …) is the _only_ vocabulary a server response uses.
Postgres functions `raise exception` with a message that's exactly one
of these codes; `packages/server/src/errors.ts#mapPostgresError`
translates that (or a `42501` permission-denied SQLSTATE) into an
`AppError` with the right HTTP status, and the Express error handler
(`packages/server/src/app.ts`) serializes `{ error: { code, message } }`
— a raw driver/SQL error string never reaches the client.
`packages/data-server/src/ApiClient.ts#ApiRequestError` carries the same
code back into the frontend, and screens map it through
`API_ERROR_MESSAGES_RU` for a Russian message instead of showing raw
text (e.g. `apps/guest/src/routes/ClubScreen.tsx`'s redeem-error
handling).

## 10. Local backend infrastructure

See `docs/LOCAL-BACKEND.md` for full operational detail. Summary: no
Docker/Podman/Colima is installed on the dev machine this was built on,
so `supabase start`'s containerized stack isn't available; instead,
Postgres 16 runs as a plain Homebrew install in a project-scoped data
directory (`infra/db/pgdata`, port 54329, `infra/db/scripts/*.sh`
manage init/start/stop/migrate/seed/reset), and `packages/server` is a
small Express API standing in for what PostgREST + GoTrue would
otherwise provide. If Docker becomes available later, the SQL schema
and RLS policies in `infra/db/migrations` are close to what a
`supabase init` project's migrations would contain unchanged.

## 11. Tests

- `packages/domain/tests` (18) + `packages/utils/tests` (8) — pure
  logic, no I/O, unchanged from the previous milestone.
- `packages/server/tests` (25) — integration tests against the real
  local Postgres (`pnpm test:server`): both loyalty scenarios end to
  end over real HTTP, QR expiry/reuse/invalid-token handling, and RBAC
  (cross-customer data leakage, role enforcement, unauthenticated
  access) — see `packages/server/tests/{flows,qr,security}.test.ts`.
  Each test file truncates and reseeds the database itself
  (`infra/db/scripts/wipe.sh`), so the suite is safe to re-run without a
  manual reset.
- A Playwright smoke script (not checked into the repo as an automated
  CI test — see Known limitations) drove real browser sessions for
  Guest and Staff against the real backend end to end, confirming both
  scenarios' exact numbers and that a genuinely-issued QR image
  round-trips through a standard QR decoder.

## 12. Known limitations (honest list)

- **Staff/Admin auth is email/password against demo accounts**, not
  PIN/badge/SSO for staff or phone-OTP for guests. The `LuaApiClient`
  boundary is shaped so swapping the verification step later doesn't
  touch UI code — see `docs/LOCAL-BACKEND.md` §4.
- **No rate limiting, no production secrets management** — this server
  has no deployment story beyond localhost/LAN. See
  `docs/QR-SECURITY.md`.
- **Cross-device camera testing wasn't physically verified against a
  real iPhone** from this environment — Playwright's fake-camera-device
  flags proved the `getUserMedia`/`BarcodeDetector`/`jsQR` code paths
  work and a genuinely-rendered QR round-trips through a real decoder,
  but a physical phone's Safari camera permission prompt and HTTPS
  requirements weren't exercised. `docs/LOCAL-BACKEND.md` §6 explains
  exactly what will and won't work and why.
- **Admin menu/rewards/staff management stays read-only** this round —
  only the Loyalty program screen writes to the real backend
  (`PATCH /api/admin/loyalty/program`). Adding CRUD for products/rewards/
  staff is additive (the RLS/grant shape already distinguishes
  `app_admin`), not a redesign.
- **No Realtime.** Screens refetch on navigation rather than subscribing
  to live updates — acceptable per the brief's explicit permission to
  prefer refetch-on-focus over a Realtime setup this round.
- **No background expiry sweep** for abandoned `PENDING` redemptions —
  handled lazily on the next confirm attempt instead of a scheduled job.
- **API error messages are ru-only** (`API_ERROR_MESSAGES_RU`) — the
  typed `ApiErrorCode` vocabulary itself is locale-independent, but a
  `kk`/`en` message map hasn't been written yet.
- **No offline/service-worker PWA behavior.** Guest ships a web manifest
  and safe-area-correct layout but no service worker/offline cache.
- **The Playwright E2E smoke run is a script, not a committed automated
  test** — it lives outside the repo (run manually against a live local
  stack) rather than as a `pnpm test:e2e` CI-style suite, since it needs
  three dev servers and a seeded database running simultaneously.
  `packages/server/tests` cover the same assertions at the HTTP-integration
  level, which _is_ part of `pnpm verify`.
