# QR security model

Short version: the QR code a guest shows is a random string the server
generated; the server only ever stores a hash of it; it expires in
30–300 seconds (Admin-configurable); and every state-changing operation
that follows a scan is one atomic Postgres transaction the client cannot
half-execute or replay.

## Token model

`packages/server/src/qr.ts`:

```ts
generateRawToken(); // 256 bits of CSPRNG output, base64url — the value embedded in the QR image
digestToken(raw); // SHA-256 hex digest — the only thing ever written to the database
```

The raw token exists in exactly two places: the HTTP response that
issues it (`POST /me/qr/identity`, `POST /me/rewards/:id/redeem`) and the
QR image rendered from it (`apps/guest/src/components/QrImage.tsx`, via
the `qrcode` package — a real, camera-decodable QR, not a decorative
approximation; see the product brief §19). A database read — a backup, a
leaked snapshot, an over-privileged query — can never recover a usable
token from `qr_sessions.token_digest`.

`infra/db/migrations/003_loyalty_rewards_qr.sql`'s `qr_sessions` table:

| column                         | purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `token_digest`                 | unique; what gets looked up on scan                              |
| `purpose`                      | `IDENTITY` \| `REWARD_REDEMPTION` — never mixed, see below       |
| `customer_id`                  | whose token this is                                              |
| `reward_redemption_id`         | set only for `REWARD_REDEMPTION`, enforced by a CHECK constraint |
| `expires_at`                   | TTL cutoff                                                       |
| `used_at` / `used_by_staff_id` | single-use marker (reward tokens only — see below)               |

## TTL

Stored as `loyalty_programs.qr_token_ttl_seconds` (30–300, CHECK
constraint), not hard-coded — Lua Admin's Loyalty screen edits it live
and it takes effect on the _next_ token issued
(`packages/server/src/loyaltyProgram.ts` reads it fresh on every issue,
no caching). Default 90s, inside the product brief's 60–120s target.

## Purposes are never conflated

- **`IDENTITY`** — the guest's own rotating QR, used for Scenario A
  (attach a purchase). Not single-use: the guest's QR screen re-issues a
  new one automatically when the countdown hits zero, and a staff device
  is allowed to resolve the same still-valid one more than once while
  deciding which order to attach (e.g. two items rung up back to back).
  What _is_ enforced is that attaching an order twice doesn't double-earn
  — see "Atomicity" below, not the token's own reuse.
- **`REWARD_REDEMPTION`** — tied to exactly one `reward_redemptions` row
  (`PENDING` → `FULFILLED`) and is genuinely single-use: `used_at` is set
  the instant `confirm_reward_redemption()` succeeds, and
  `resolve_qr_token()` rejects a subsequent scan of the same token with
  `QR_USED`.

`resolve_qr_token()` (`infra/db/migrations/005_functions.sql`) returns
exactly one of `QR_INVALID` / `QR_EXPIRED` / `QR_USED` or the resolved
summary — never a raw database error, never more of the customer record
than the DTO needs.

## Replay / race protection

The scenario the brief calls out explicitly: two staff devices scan the
same reward QR within the same second. `confirm_reward_redemption()`:

```sql
select * into v_redemption from reward_redemptions where id = p_redemption_id for update;
-- ...status checks...
insert into loyalty_transactions (..., idempotency_key) values (..., 'redemption:' || v_redemption.id)
```

`FOR UPDATE` takes a row lock, so the second concurrent call blocks until
the first transaction commits, then sees `status = 'FULFILLED'` and is
rejected with `REDEMPTION_ALREADY_COMPLETED` — never a second payout.
The `idempotency_key` unique constraint on `loyalty_transactions` is a
second, independent line of defense against the same double-insert, in
case anything ever calls the ledger insert outside this exact lock
discipline. `confirm_order_earn()` uses the identical `FOR UPDATE` +
`idempotency_key` (`earn:<orderId>`) shape for Scenario A.

## Atomic server-side operations

Both confirmation paths are single Postgres functions
(`SECURITY DEFINER`, pinned `search_path`, granted only to `app_staff` /
inherited by `app_admin` — see `docs/ARCHITECTURE.md` §13), not a
sequence of separate inserts issued by the API layer:

- `confirm_reward_redemption(redemption_id, staff_id)` — validates
  status/expiry/reward-active/balance, inserts the `-cost` ledger row,
  flips the redemption to `FULFILLED`, marks the QR session used, writes
  an audit log entry — all inside the one transaction the function body
  runs in. If the client's connection drops halfway, Postgres rolls the
  whole thing back; there is no intermediate state where points were
  deducted but the redemption wasn't marked fulfilled, or vice versa.
- `confirm_order_earn(order_id, customer_id, staff_id)` — same shape for
  Scenario A: assigns the order, computes points from the _current_
  `loyalty_programs` row, inserts the ledger entry, writes the audit log.

## What's real today vs. what production needs on top

**Real:** CSPRNG token generation, hash-at-rest storage, configurable
TTL enforced server-side, purpose separation, single-use enforcement for
reward tokens, row-level locking against concurrent double-confirm, a
unique-idempotency-key second line of defense, RLS on every sensitive
table (not just the token tables — see `docs/ARCHITECTURE.md` §13), and
a typed error model that never leaks a raw driver/SQL error to the
client.

**Still needed before any real deployment:**

- A production `JWT_SECRET` from a secrets manager, not a committed
  `.env.example` placeholder (loudly warned about on server startup —
  `packages/server/src/env.ts`).
- TLS everywhere (this server currently only runs over plain HTTP on a
  LAN, by design, for local dev — see `docs/LOCAL-BACKEND.md` §6).
- Real staff device authentication (PIN/badge/SSO) — Lua Staff's login
  is currently just email/password against the same demo accounts as
  everyone else; see `docs/ARCHITECTURE.md` "Known limitations".
- Rate limiting on the login and QR-resolve endpoints (none configured
  yet — a local dev server has no exposure to brute-force from the
  public internet, but production would).
- A background sweep for expired-but-never-fulfilled `PENDING`
  redemptions (they currently just sit there; `confirm_reward_redemption`
  catches an expired one lazily on the next confirm attempt and flips it
  to `EXPIRED`, but nothing proactively cleans them up on a schedule).
