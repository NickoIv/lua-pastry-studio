# Lua Platform — Architecture

This document explains the shape of the foundation laid in this repository:
what boundaries exist, why they're drawn where they are, and what a real
backend would need to slot in without forcing a UI rewrite.

## 1. High-level shape

Three independent Vite/React apps (`apps/guest`, `apps/staff`, `apps/admin`)
share five packages:

```
apps/guest, apps/staff, apps/admin
        │  import
        ▼
packages/ui        — design tokens + components (no business logic)
packages/i18n       — ru/kk/en dictionaries + provider/hook
packages/domain      — loyalty rules, ledger, redemption state machine,
                       repository interfaces, mock backend
packages/utils      — Money/points/date formatting (pure functions)
packages/types      — shared entity types, no runtime code
packages/config     — reads Vite env vars into one typed object
```

`types` has no dependencies. `domain` and `utils` depend only on `types`.
`ui` depends on `types` and `utils` (for `<Money>`/`<Points>`). Apps depend
on all five. Nothing flows backward — a change in an app can never leak
into a package, which is what makes `domain` and `ui` safely shared.

Each app owns its own **backend context** (`src/backend/context.ts`):
a `createMockBackend()` instance held in a React context. Guest and Staff
each construct their *own* instance — see §4 for why that specific choice
matters for the QR flow.

## 2. Domain boundaries

`packages/types/src` defines the entities from the product brief: `Customer`,
`CustomerProfile`, `StaffUser`/`Role`/`Permission`, `Location`, `Product`/
`ProductCategory`/`Collection`, `Promotion`, `Order`/`OrderItem`,
`LoyaltyAccount`/`LoyaltyTransaction`/`LoyaltyProgram`, `Reward`/
`RewardRedemption`, `QRToken` (+ issuer/verifier interfaces), `Notification`,
`AuditLog`. Every field that represents money is a `Money` value
(`{ currency, minorUnits }`, integer only — see §5), never a float.

`packages/domain/src/repositories` defines the interfaces every screen
talks to: `CustomerRepository`, `MenuRepository`, `OrdersRepository`,
`LoyaltyRepository`, `RewardsRepository`. Today `packages/domain/src/mock`
is the only implementation. A future `packages/domain/src/http` (or a
Supabase-backed package) implementing the *same* interfaces is a drop-in
replacement — no screen imports a mock class directly except through the
`useBackend()` hook's return type, which is `MockBackend` today and would
become a union/interface once a second implementation exists.

`packages/domain/src/loyalty` holds the only code allowed to touch point
balances: `earning.ts` (rate/rounding/tier math), `ledger.ts` (balance is
always *derived*, never trusted as stored state), `earnService.ts`
(scenario A) and `redemption.ts` (scenario B — see §3).

## 3. Loyalty: earning and redemption

**Ledger, not a counter.** `LoyaltyAccount.pointsBalance` is a cache. The
source of truth is the append-only `LoyaltyTransaction` list, and
`balanceFromLedger()` (`packages/domain/src/loyalty/ledger.ts`) recomputes
it by summing signed `points` values. Every transaction carries a `type`
(`earn` / `redeem` / `refund` / `manual_adjustment` / `birthday_bonus` /
`campaign_bonus` / `expiration` / `reversal`), an optional `orderId` /
`rewardRedemptionId` / `performedByStaffId`, a human `reason`, and an
`idempotencyKey` so a retried network call can't double-apply.

**Scenario A — purchase (`EarnService.earnForCompletedOrder`).** Takes a
completed `Order`, reads the *current* `LoyaltyProgram` (never a
hard-coded rate) and the customer's tier multiplier, and appends one
`earn` transaction keyed by `earn:${orderId}` — replaying the same order
is a no-op, not a double credit.

**Scenario B — buy with points (`RedemptionService`).** This is the part
the product brief calls out as a hard rule: *choosing* a reward must never
move points.

1. `requestRedemption(customerId, reward)` — validates the reward is
   active/in stock and the balance covers it, then creates a
   `RewardRedemption` with `status: "PENDING"`. **No ledger write here.**
2. A QR token is issued for that redemption (`QRTokenIssuer.issueRewardRedemptionToken`).
3. Staff scans it; `fulfillRedemption(redemptionId, staffId)` re-validates
   the redemption is still `PENDING` and not expired, re-checks the
   balance (in case it changed since step 1), and *only then* appends a
   `redeem` transaction (negative points) keyed by
   `redemption:${redemptionId}` — a second confirm attempt on the same
   redemption throws `RedemptionNotPendingError` instead of debiting twice.

This is covered end-to-end in `packages/domain/tests/redemption.test.ts`,
using the exact numbers from the product brief: balance 3,288 → reward
costs 2,500 → balance unchanged after *request* → 788 after *confirm*.

**Configurability.** `LoyaltyProgram` (earn rate, rounding strategy,
minimum order amount, birthday bonus, points expiry, tiers) is a plain
record read through `LoyaltyRepository.getProgram()` /
`.updateProgram()` — nothing in `domain` or the apps hard-codes "5%".
Lua Admin's Loyalty screen edits it live (in the current mock session;
persisting it is a backend concern, not a UI one).

## 4. QR security — what's real now, what's deferred

The brief is explicit that this stage should model the interfaces
correctly without faking production cryptography. `packages/types/src/qr.ts`
defines the shape a real implementation must have:

- `QRToken` — opaque `encoded` string, `purpose` (`IDENTITY` |
  `REWARD_REDEMPTION`), `expiresAt`. The frontend never parses or
  constructs `encoded` itself.
- `QRTokenIssuer` / `QRTokenVerifier` — issue, verify, and `markUsed()`
  (so a second scan of the same token is rejected — replay protection).

`packages/domain/src/qr/mockTokenService.ts` implements both with an
in-memory map and a random string instead of a signed JWT/HMAC — it is
loudly named `MockQRTokenService` and documented as **development-only**.
A production issuer/verifier has to live server-side (it must be able to
reject a token the client didn't have the private key to forge); swapping
it in means writing one class against the same two interfaces, not
touching any screen.

**Known limitation, and why it's fine at this stage:** Lua Guest and Lua
Staff each run their own `createMockBackend()` instance in dev, so a QR
code rendered by Guest cannot literally be scanned and verified by Staff
in this repo — there is no shared process/server yet. Staff's Scan screen
demonstrates the full issue → encode → scan → verify → mark-used sequence
by doing all five steps against its own instance ("simulate scan"). The
piece a real backend adds is the network hop between two devices, not a
different protocol shape.

TTL is configurable, not hard-coded: `VITE_QR_TOKEN_TTL_SECONDS`
(`.env.example`, default 90s, brief's target is 60–120s) flows through
`packages/config`'s `APP_CONFIG.qrTokenTtlSeconds`.

## 5. Money

`packages/types/src/money.ts`: `Money = { currency: "KZT", minorUnits: number }`,
always an integer. `money(1900)` constructs `1900 ₸` as `190000` minor
units; arithmetic (`addMoney`, `subtractMoney`, `sumMoney`, …) operates on
integers only. Display formatting (`packages/utils/src/money.ts`) uses
`Intl.NumberFormat` and is the *only* place a `Money` becomes a string —
no component formats currency by hand. There is no floating-point money
anywhere in `domain` or `types`.

## 6. RBAC

`packages/types/src/staff.ts` defines `Role` (`BARISTA`, `WAITER`,
`SHIFT_MANAGER`, `ADMIN`, `OWNER`), `Permission`, and a static
`ROLE_PERMISSIONS` map plus `roleHasPermission()`. Lua Staff uses it today
to gate the Shift Log entry point (`shift.view_log`) behind
`SHIFT_MANAGER`+. `StaffFacingCustomer` (`packages/types/src/customer.ts`)
is the deliberately reduced view a staff device is allowed to render after
a scan — name, tier, masked phone; no birth date, no full history, no
admin fields. There is no real authentication yet (Staff's login is a
role picker, not a PIN/SSO check) — see Known limitations below.

## 7. i18n

`packages/i18n` ships flat, namespaced dictionaries (`"guest.club.title"`
style keys) for `ru` (primary/canonical), `kk`, and `en`, typed so a
missing key in `kk.ts`/`en.ts` is a compile error, not a silent fallback.
`I18nProvider` + `useTranslation()` cover the app chrome — navigation,
headers, buttons, section titles — for all three apps today. Deep
microcopy (every toast/validation string) is not yet routed through the
dictionary; see Known limitations.

## 8. Why mock repositories are safe to keep around

Every screen depends on a repository *interface*
(`packages/domain/src/repositories`), obtained through one `useBackend()`
hook per app. `createMockBackend()` is the only thing that constructs
concrete classes. This means:

- Adding a real backend is writing `createHttpBackend()` (or a
  Supabase-backed equivalent) that returns the same shape.
- Nothing in `apps/*/src/routes` needs to change — they call
  `backend.orders.listByCustomer(id)`, not `fetch(...)`.
- Mock and production code never intermix inside a component; the
  boundary is the backend factory, one file per app.

## 9. Planned production backend

Supabase/Postgres is the intended target (Auth, Postgres, RLS, Storage,
Realtime, Edge Functions all map cleanly onto the repository interfaces
above), but **no Supabase project is connected in this repository** — see
`.env.example` for the placeholder `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` fields, both intentionally blank. Standing up an
actual project, writing the Postgres schema (mirroring `packages/types`)
and RLS policies, and implementing the repository interfaces against it
is explicitly out of scope for this pass.

## 10. Known limitations (honest list)

- **No real authentication.** Guest has no login flow (the signed-in
  customer is fixed to a fixture); Staff's login is a role picker, not a
  PIN/SSO/device check. Both need a real auth provider before production.
- **QR tokens aren't cross-app in dev**, as explained in §4 — each app's
  mock backend is its own process-local instance.
- **No real QR scanning/camera.** Guest renders a QR-*shaped* deterministic
  pattern (`apps/guest/src/components/QrCodeArt.tsx`) for visual fidelity,
  not a real scannable encoding; Staff's "scan" is two dev buttons. Both
  are called out in-code and were explicitly deferred by the brief.
- **Admin writes don't persist** past the current tab's session — there's
  no backend to persist to yet (mutations go through repository methods
  like `LoyaltyRepository.updateProgram`, so wiring persistence later is
  additive, not a rewrite).
- **i18n covers UI chrome, not every string.** ru/kk/en are wired end to
  end structurally; kk/en translations for the seeded menu/reward copy are
  present in fixtures but haven't been reviewed by a native speaker.
- **No offline/service-worker PWA behavior yet.** Guest ships a web
  manifest and safe-area-correct layout (installable, standalone-ready)
  but no service worker/offline cache.
- **No automated visual regression suite.** UI correctness was verified
  manually (typecheck + build + a Playwright pass checking for console
  errors and horizontal overflow across all three apps) rather than with
  a committed screenshot-diff test.
