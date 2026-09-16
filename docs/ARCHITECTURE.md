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

## 9b. Admin catalog CMS

Lua Admin's Menu/Rewards/Collections screens are real CRUD against the
real backend now, not read-only views — `infra/db/migrations/013_catalog_cms_columns.sql`
adds `slug`/`active`/`updated_at` to categories and products,
`unavailable_reason` to `product_availability`, and `subtitle`/`active`/
`sort_order` to collections; `014_admin_catalog_rls.sql` grants
`app_admin` write access and turns RLS on for these tables (previously
disabled). `packages/server/src/routes/{adminCatalog,adminCollections}.ts`
is the write surface, gated by `requireRole("ADMIN", "OWNER")` at the API
layer _and_ by the RLS grants at the database layer — a bug in one
doesn't save the other, same principle as §6.

**Delete safety is deliberate, not uniform.** Products and rewards are
archive-only: there is no DELETE grant for `app_admin` on either table
at all (defense in depth beyond just omitting the route), because
`order_items`/`reward_redemptions` reference them and losing that
history would corrupt a real business's own records. Categories and
collections _are_ hard-deletable — categories have no historical
dependency of their own (a `23503` foreign-key violation from a
category still holding products is mapped to a friendly
`CATEGORY_IN_USE` 409, not a raw Postgres error), and collections are a
pure presentation grouping.

**Reward price changes never touch an existing redemption's cost.**
`reward_redemptions.points_cost` is captured once at
`request_reward_redemption` time (§3) and the Admin reward-update route
only ever writes `rewards.points_cost` — it has no code path that
touches `reward_redemptions` at all. `packages/server/tests/adminCatalog.test.ts`
proves the full scenario: request a reward at its current price, change
the price in Admin, confirm the pending redemption, and assert the
ledger deduction is the _original_ price.

**Availability vs. active are two different flags on purpose.**
`active = false` means archived/discontinued — hidden everywhere,
including Admin's default view. `product_availability.in_stock = false`
for a given location means "temporarily out of stock at this location"
— the product stays active and visible to Guest, just with an explicit
"Нет в наличии" treatment (`apps/guest/src/components/ProductCard.tsx`)
instead of disappearing, because a barista marking the last croissant
sold out shouldn't make it look like the product was discontinued.
`GET /api/menu/products` computes `inStockAnywhere` as `bool_or` across
all locations so Guest only shows the tag when a product is out
_everywhere_, not just at one location.

Every write in both route files calls `writeAuditLog()`
(`packages/server/src/audit.ts`) inside the same transaction — actor,
action (from the typed `AUDIT_ACTIONS` union in `packages/types/src/audit.ts`),
target type/id, and non-secret metadata. There's no `/admin/audit-log`
read endpoint yet (see §12), so today this is proven by querying
`audit_logs` directly in tests, not through the UI.

## 9c. Rate limiting — dev-only, honestly

`packages/server/src/rateLimit.ts` is a small in-memory fixed-window
limiter applied to `auth` (login), `qr-issue`, `qr-resolve`,
`reward-confirm`, and `earn-confirm`. It is explicitly **not** what a
deployed service should use: state lives in one Node process's memory,
so it resets on restart and doesn't work at all across multiple server
instances behind a load balancer. A real deployment needs a shared
store (Redis, or Postgres itself) keyed the same way. This exists to
demonstrate the shape of the defense (and to have something
`packages/server/tests/rateLimit.test.ts` can assert against — including
a live test that a 31st request in a window is actually rejected while
a different customer's requests are unaffected), not as a
production-ready control. `packages/server/src/routes/media.ts`'s upload
endpoint gets its own limiter (30 uploads / 5 min per staff session, §9g)
since it's the most resource-intensive of the newer sensitive endpoints.

## 9d. Staff management & OWNER protection

Lua Admin's Staff screen has real CRUD now — create, edit display
name/role/location, deactivate/reactivate — but it's deliberately not a
thin grant + `UPDATE` like the catalog CMS (§9b). Two things make staff
accounts different: a plaintext password has to be hashed with
`crypt()` before it's ever written (same as `login_staff` in
`009_login_functions.sql`), and there's a hard invariant — **no path
through Lua Admin can create, promote to, demote, deactivate, or
otherwise touch an OWNER account** — that has to hold even if the API
layer's own check has a bug.

`infra/db/migrations/015_staff_management.sql` puts both concerns in
two `SECURITY DEFINER` functions, `admin_create_staff_account` and
`admin_update_staff_account`. The OWNER guard lives in the function
body (checked against the *current* role in the database, not
whatever the caller claims), so it holds even for a hand-crafted SQL
call — `packages/server/tests/adminStaff.test.ts` proves this by
calling the function directly, bypassing the API layer's own
`role !== "OWNER"` pre-check entirely. The API layer's `readAssignableStaffRole`
validation (`packages/server/src/validation.ts`) is a second, independent
line of defense — belt and suspenders, the same pattern as §9b's
delete-safety grants.

One OWNER account is seeded (`marat@lua.dev`) and nothing in this round
gives any UI a way to create a second one or hand ownership to someone
else — that's intentionally left as a separate, more heavily-guarded
future "owner handover" feature, not something to bolt onto ordinary
staff management.

**A found-and-fixed bug worth noting**: both functions' `RETURNS TABLE(..., role text, ...)`
signature implicitly declares a PL/pgSQL variable named `role` in scope
for the whole function body, which shadowed the *table column*
`staff_profiles.role` in a few unqualified references — Postgres raised
"column reference is ambiguous" rather than silently doing the wrong
thing, but it's a sharp edge worth knowing about the next time a
function's `RETURNS TABLE` column list shares a name with a table it
queries. Every reference is qualified (`staff_profiles.role`) now.

## 9e. Customer management

`GET /admin/customers` is paginated and searchable (`?q=&page=&pageSize=`)
and returns each row's balance/order-count/lifetime-spend/last-visit
from one aggregate query — the `admin_customer_summary` view in
`infra/db/migrations/016_customer_management.sql` — not one query per
customer. `GET /admin/customers/:id` (Customer Detail) shows the same
customer's full order history, ledger, and reward redemptions.

Name and birthday are editable (`PATCH /admin/customers/:id`, grant is
column-scoped to `first_name`/`last_name`/`birth_date` — see the same
migration); phone/email are deliberately **not** grantable yet. Customer
identity is keyed on `customer_profiles.id`, never on phone number —
changing contact details safely (verification, uniqueness, notifying
the customer) is a real future feature (phone/email change flow with
OTP or an equivalent verification step), not something this round's
column-level grant tries to half-build.

**Staff's QR-scan DTO is unchanged.** `resolve_qr_token()` (§6) still
returns exactly `{id, displayName, maskedPhone, balance}` — Customer
Detail existing in Admin doesn't mean Staff's scanner gets to see more;
`packages/server/tests/adminCustomers.test.ts` asserts the scan
response still has no `birthDate`/`phone`/`email` keys at all.

## 9f. Manual loyalty point adjustments

The one place an ADMIN/OWNER can move a customer's balance by hand.
Never a `balance` column update (there is none, §3) and never an edit
to an existing `loyalty_transactions` row — `admin_adjust_customer_points`
in `infra/db/migrations/017_manual_loyalty_adjustment.sql` inserts
exactly one new `manual_adjustment` ledger row, the same shape
`confirm_order_earn`/`confirm_reward_redemption` already use for
`earn`/`redeem`.

Two guards live in the database, not just the Customer Detail modal's
client-side check:

- **`pg_advisory_xact_lock(hashtext(customer_id))`** serializes
  concurrent balance-affecting operations for that one customer within
  the transaction, so two simultaneous adjustment requests can't both
  read a stale balance and both pass the next guard.
- **The resulting balance can never go negative** — computed and
  checked inside the same locked transaction, not trusted from the
  request body.

**Idempotency**: the client can pass an `idempotencyKey`; a retried
request with the same key returns the original transaction
(`replayed: true` in the response) instead of double-applying it —
using the same `loyalty_transactions.idempotency_key` unique
constraint every other write in this system already relies on (§3).
Lua Admin's `ManualAdjustmentModal` generates one random key per modal
open, covering the "double-click / flaky network retry" case without
any server-side deduplication window or TTL to reason about.

**Reversal foundation, not a reversal feature.** `loyalty_transactions.type`
already includes `reversal` (`003_loyalty_rewards_qr.sql`, unchanged
this round) — a future "undo this transaction" feature has a type to
insert as, following the same append-only, never-edit-old-rows
discipline. Nothing writes a `reversal` row yet; building the actual
UI/API for it is future work.

## 9g. Media foundation — local upload, no cloud storage

No Cloudinary/S3/Supabase Storage. `media_assets`
(`infra/db/migrations/018_media_assets.sql`) is the one governed record
of anything an admin uploads — kind, path, served URL, alt text,
dimensions, real (sniffed) MIME type, size, uploader, status. Products
and collections keep displaying an image through their existing
`image_url` text column exactly as before (an admin can still paste an
external URL by hand) — an upload just points that column at the
asset's served URL, so there's one display semantic ("a URL string"),
not a second parallel way to reference an image.

**Now a real FK, derived rather than dual-written**
(`infra/db/migrations/019_media_asset_fk.sql`). `products.media_asset_id`
and `collections.media_asset_id` reference `media_assets(id)`, but the
API never accepts `mediaAssetId` as client input — `packages/server/src/routes/{adminCatalog,adminCollections}.ts#resolveMediaAssetId`
recomputes it from `image_url` on every create/update, by matching the
submitted URL back to an uploaded asset's served URL. A hand-pasted
external URL simply resolves to `null`. That's what keeps `image_url`
(what Guest/Staff/Admin actually render — no read query had to change)
and `media_asset_id` (what governs deletion) from ever drifting apart:
there's one value the client controls (`image_url`) and one value the
server derives from it, never two independent fields a client could
push out of sync.

**Safe delete.** `DELETE /admin/media/:id` (`packages/server/src/routes/media.ts`)
now performs a real delete — row and file — instead of only flipping
`status`, but checks `media_asset_id` usage first and refuses with
`MEDIA_ASSET_IN_USE` (409, naming the specific products/collections)
if anything still points to it. The FK itself (plain `RESTRICT`, no
`ON DELETE` clause) backs this up at the database layer independent of
that pre-check, the same defense-in-depth shape as `CATEGORY_IN_USE`
(§9b).

**Upload pipeline** (`packages/server/src/media.ts` +
`packages/server/src/routes/media.ts`, ADMIN/OWNER only, ~30/5min rate
limited):

1. `multer` buffers the upload in memory (8 MB cap, enforced by multer
   itself before any of this code runs).
2. The file's **real bytes** are sniffed for a PNG/JPEG/WEBP magic
   number — the client-supplied `Content-Type` header and filename are
   never trusted; a `.png`-named file whose bytes don't match any of
   the three accepted magic numbers is rejected regardless of what
   header it arrived with.
3. Dimensions are read straight from each format's own header bytes —
   no image-processing dependency for just that.
4. The file is written under a **server-generated random UUID
   filename** (`<uuid>.<ext>`) inside `packages/server/uploads/<kind>/` —
   the client's original filename is never used to build a path, so
   there's no path-traversal surface to sanitize in the first place
   (`../../etc/passwd.png` as a filename just becomes an unrelated
   random UUID on disk).
5. A `media_assets` row is inserted and the response is the same shape
   Admin's `ImageUploadField` and Guest's `<ImageSurface>` both consume.

Served at `/media/<kind>/<file>` via `express.static`, mounted before
`express.json()` so uploads never touch the JSON body parser. The
returned URL is server-relative (`/media/product/<id>.png`) — the
server has no reliable way to know its own externally-reachable origin
(that changes for LAN/phone testing, §10). Resolving it into an
absolute URL is the **client's** job:
`packages/config/src/appConfig.ts#resolveMediaUrl` resolves a relative
media URL against that app's own configured `VITE_LUA_API_URL` origin.
**A found-and-fixed bug**: before this existed, Guest (port 5173)
rendered a server-relative `/media/...` URL as-is, which the browser
resolved against Guest's *own* origin instead of the API server's
(port 4000) — the image 404'd, silently fell back to the placeholder,
and nothing in the network tab looked obviously wrong at a glance. This
is exactly the kind of bug a real device/LAN test (not just "does the
API return the right JSON") catches — `e2e/media-upload.spec.ts` now
asserts an actual `<img>` tag renders on Guest, not just that the API
response contains a URL string.

`ImageSurface` (`packages/ui`) renders the real image when `src` is
given and falls back to the existing placeholder mark — including if
the image fails to load (`onError`) — so a missing/broken image is
never a broken `<img>` icon in the UI.

## 9h. Timezones

Three different things, three different rules:

- **`timestamptz` columns** (`created_at`, `fulfilled_at`, etc.) — stored
  and compared correctly by Postgres regardless of session timezone;
  the "today's orders" dashboard stat (§25) explicitly converts to
  `Asia/Almaty` before taking `::date`, since "today" on a dashboard
  should mean the same calendar day to whoever's looking at it,
  wherever the server process happens to be running.
- **`date` columns** (`customer_profiles.birth_date`) have no
  time-of-day or timezone component at all — the only correct handling
  is to never construct a JS `Date` from one. node-postgres's default
  parser does exactly that (returns a `Date` at local midnight), which
  then serializes through `JSON.stringify` as a full UTC timestamp,
  shifting the calendar day by one for the Asia/Almaty (UTC+5) server
  this runs on. **Found and fixed this round**: `packages/server/src/db.ts`
  overrides the OID-1082 (`date`) type parser to keep it as the plain
  `"YYYY-MM-DD"` string Postgres already sends over the wire — never a
  `Date` object. `packages/server/src/validation.ts#readOptionalDateOnly`
  applies the same discipline on the write side, validating the string
  shape directly rather than round-tripping through `new Date(...)`.
- **UI display** — Admin's Audit Log timestamps render with an explicit
  `timeZone: "Asia/Almaty"` (`Intl.DateTimeFormat` option), not
  whatever timezone the viewer's own browser happens to be in.

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

## 10b. Local demo launcher

`scripts/demo/{doctor,start,stop,reset,open}.mjs` (`pnpm demo:*`) is a
thin Node orchestrator over §10's existing `infra/db/scripts/*.sh` and
`pnpm dev:*` — it doesn't reimplement Postgres lifecycle management,
just chains the already-correct scripts together and adds what they
don't do on their own: port/health polling before declaring readiness,
PID tracking in a gitignored `.runtime/` directory (so `demo:stop` only
ever signals a process this launcher itself started — never an
unrelated Node/Postgres process on the machine), Mac LAN-IP detection
for phone testing, and a human-readable status report. `demo:start` is
idempotent — re-running it while everything's already up just confirms
health instead of spawning duplicates, detected via the same PID
tracking. `demo:reset` chains `start → migrate → wipe` (not a full
`db:reset` reinit, since that would drop connections a running API
server holds) and asserts Николай's balance is exactly 3,288 afterward
as a correctness check, not just a "did the script exit 0" check.

**LAN/CORS, made to work without any per-network configuration.**
Guest/Staff/Admin's `vite.config.ts` all set `server.host: true` (bind
`0.0.0.0`, not just localhost), and
`packages/config/src/appConfig.ts#getApiBaseUrl` derives the API origin
from `window.location.hostname` when `VITE_LUA_API_URL` isn't set
explicitly — so the exact same build works whether a page was opened
via `localhost` (the Mac) or the Mac's LAN IP (a phone on the same
Wi-Fi), with no IP address ever hardcoded anywhere in source. The
API's own CORS policy (`packages/server/src/corsPolicy.ts`) was
tightened to match: the previous default was a wide-open `*`, now the
default is "localhost or an RFC1918 private-LAN address, only on the
three known Vite dev ports" — a real allow-list pattern, not
"disabled for convenience." Setting `CORS_ORIGIN` to an explicit
comma-separated origin list (instead of leaving it at the `*` example
value) switches to a plain allow-list instead — the shape a future
non-local deployment would use, kept structurally separate from local-
dev behavior rather than one wildcard doing double duty for both.

See `docs/TEST-LUA-LOCALLY.md` for the non-developer walkthrough this
launcher exists to support.

## 11. Tests

- `packages/domain/tests` (18) + `packages/utils/tests` (8) — pure
  logic, no I/O, unchanged from the previous milestone.
- `packages/server/tests` (97) — integration tests against the real
  local Postgres (`pnpm test:server`): both loyalty scenarios end to
  end over real HTTP, QR expiry/reuse/invalid-token handling, RBAC
  (cross-customer data leakage, role enforcement, unauthenticated
  access), the Admin catalog CMS (create/persist, RBAC-forbidden,
  Guest-visibility, archive semantics, category delete-safety, audit
  logging, reward-price snapshot), the media asset FK (product/collection
  linkage derived from `image_url`, external URLs never linking, safe
  delete blocked-with-names when in use, hard delete when not, path-
  traversal safety), the rate limiter (blocked at the
  limit, unaffected for a different customer), the audit log read
  endpoint (permissions, filtering, pagination), staff management
  (create/role-change/deactivate, OWNER protection proven both through
  the API and by calling the DB function directly), customer management
  (list aggregate correctness, detail, name/birthday edits, the
  QR-scan DTO staying minimal), manual point adjustments (ledger-row
  creation, negative-balance guard, idempotent retry, audit trail),
  media upload (valid formats, oversized/spoofed/path-traversal
  rejection, RBAC), the dev-mode CORS policy (localhost/private-LAN
  origins on the three known dev ports allowed, public/arbitrary origins
  and unexpected ports rejected — `packages/server/src/corsPolicy.ts`,
  see "Local demo launcher" below), and the health endpoint (reports a
  real DB connectivity check, never leaks connection strings/secrets) —
  see `packages/server/tests/*.test.ts`. Each test
  file truncates and reseeds the database itself
  (`infra/db/scripts/wipe.sh`), so the suite is safe to re-run without a
  manual reset.
- `playwright.config.ts` + `e2e/*.spec.ts` — real Chromium sessions
  against the real backend (`pnpm e2e`, after `pnpm db:reset` and the
  four `pnpm dev:*` processes are running): an Admin product-lifecycle
  flow proven through both the real Admin and Guest UIs, the reward
  price-change snapshot proven through the real Guest redemption flow
  plus direct API calls for the confirm step (deliberately not driven
  through Staff's camera scanner — see `docs/QR-SECURITY.md`), full
  Customer Detail and Staff management lifecycles through the real UI,
  a local image upload that Guest's Menu actually renders, and a
  presentation-smoke spec that captures the 11 screenshots in
  `artifacts/presentation/` while asserting zero browser console errors
  across every screen it visits.

## 12. Known limitations (honest list)

- **Staff/Admin auth is email/password against demo accounts**, not
  PIN/badge/SSO for staff or phone-OTP for guests. The `LuaApiClient`
  boundary is shaped so swapping the verification step later doesn't
  touch UI code — see `docs/LOCAL-BACKEND.md` §4.
- **Rate limiting is in-memory/single-process only** (§9c) and **there's
  no production secrets management** — this server has no deployment
  story beyond localhost/LAN. See `docs/QR-SECURITY.md`.
- **Cross-device camera testing wasn't physically verified against a
  real iPhone** from this environment — Playwright's fake-camera-device
  flags proved the `getUserMedia`/`BarcodeDetector`/`jsQR` code paths
  work and a genuinely-rendered QR round-trips through a real decoder,
  but a physical phone's Safari camera permission prompt and HTTPS
  requirements weren't exercised. `docs/LOCAL-BACKEND.md` §6 explains
  exactly what will and won't work and why.
- **No admin UI to browse/delete stored media assets.** `media_asset_id`
  is now a real FK and `DELETE /admin/media/:id` is a real, usage-checked
  delete (§9g), but nothing in Lua Admin's Product/Collection editors
  calls it yet — removing an image from a product form only detaches it
  (`imageUrl: null`), it doesn't free the underlying file. Actually
  deleting a stored asset today is an API capability proven by
  `packages/server/tests/media.test.ts`, not a screen a business owner
  would find. A small "media library" list is the natural next surface,
  deliberately out of scope for this round's presentation-polish pass.
- **No owner-handover flow.** The one OWNER account is seeded and
  nothing in Lua Admin can create a second one or transfer the role —
  intentional (§9d), but a real deployment eventually needs some
  (separately, more heavily-guarded) way to do this.
- **Phone/email are still immutable in Lua Admin.** Customer name and
  birthday are editable (§9e); changing contact details needs a
  verification flow (OTP or equivalent) this round doesn't build,
  though the data model (`customer_profiles.id` as the stable identity,
  never the phone number) already supports adding one later.
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
