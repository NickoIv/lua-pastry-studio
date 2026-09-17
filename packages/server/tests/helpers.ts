import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { createApp } from "../src/app";
import { resetRateLimitState } from "../src/rateLimit";

/**
 * Integration tests run against the real local dev Postgres (infra/db) —
 * not a mock. `resetDatabase()` shells out to infra/db/scripts/wipe.sh,
 * which truncates every data table and re-seeds without restarting
 * Postgres itself (a full stop/reinit, as `pnpm db:reset` does, would
 * invalidate this file's own open pool connections mid-suite). Every
 * test run starts from the exact seed in docs/LOCAL-BACKEND.md. It also
 * clears the in-memory rate-limit buckets, so one test file's login/QR
 * volume never bleeds into the next file's counters.
 */
const REPO_ROOT = path.resolve(__dirname, "../../..");

export function resetDatabase() {
  execFileSync("bash", ["infra/db/scripts/wipe.sh"], { cwd: REPO_ROOT, stdio: "pipe" });
  resetRateLimitState();
}

/** Superuser pool for direct fixture setup that bypasses RLS/functions — mirrors infra/db/seed.sql, not the API surface under test. */
export const superuserPool = new pg.Pool({
  connectionString: `postgres://${process.env.USER}@127.0.0.1:${process.env.LUA_PG_PORT ?? "54329"}/lua`,
});

export const app = createApp();

export const SEED = {
  nikolayEmail: "nikolay@lua.dev",
  nikolayPassword: "LuaGuest123!",
  nikolayId: "60000000-0000-0000-0000-000000000001",
  baristaEmail: "aigerim@lua.dev",
  baristaPassword: "LuaStaff123!",
  baristaId: "50000000-0000-0000-0000-000000000001",
  baristaStaffCode: "AIGERIM",
  baristaPin: "4821",
  shiftManagerEmail: "yerlan@lua.dev",
  shiftManagerPassword: "LuaStaff123!",
  shiftManagerId: "50000000-0000-0000-0000-000000000002",
  adminEmail: "dana@lua.dev",
  adminPassword: "LuaStaff123!",
  adminId: "50000000-0000-0000-0000-000000000003",
  ownerEmail: "marat@lua.dev",
  ownerPassword: "LuaStaff123!",
  ownerId: "50000000-0000-0000-0000-000000000004",
  petitPrinceRewardId: "70000000-0000-0000-0000-000000000003",
  cappuccinoRewardId: "70000000-0000-0000-0000-000000000001",
  demoOrderId: "80000000-0000-0000-0000-000000000099",
  secondCustomerId: "60000000-0000-0000-0000-000000000002",
  coffeeLocationId: "10000000-0000-0000-0000-000000000001",
  kokTobeLocationId: "10000000-0000-0000-0000-000000000002",
  coffeeCategoryId: "20000000-0000-0000-0000-000000000001",
  espressoProductId: "30000000-0000-0000-0000-000000000001",
};
