import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import { createApp } from "../src/app";

/**
 * Integration tests run against the real local dev Postgres (infra/db) —
 * not a mock. `resetDatabase()` shells out to infra/db/scripts/wipe.sh,
 * which truncates every data table and re-seeds without restarting
 * Postgres itself (a full stop/reinit, as `pnpm db:reset` does, would
 * invalidate this file's own open pool connections mid-suite). Every
 * test run starts from the exact seed in docs/LOCAL-BACKEND.md.
 */
const REPO_ROOT = path.resolve(__dirname, "../../..");

export function resetDatabase() {
  execFileSync("bash", ["infra/db/scripts/wipe.sh"], { cwd: REPO_ROOT, stdio: "pipe" });
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
  adminEmail: "dana@lua.dev",
  adminPassword: "LuaStaff123!",
  petitPrinceRewardId: "70000000-0000-0000-0000-000000000003",
  demoOrderId: "80000000-0000-0000-0000-000000000099",
  secondCustomerId: "60000000-0000-0000-0000-000000000002",
};
