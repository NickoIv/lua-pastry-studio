#!/usr/bin/env node
// `pnpm demo:reset` — deterministic reset back to the seeded demo state
// (Nikolay at exactly 3,288 points, LUA-1001 open for the earn demo,
// etc.). Safe to run while the demo is up; the API's connection pool
// reconnects on its own (see packages/server/src/db.ts).
import { execFileSync } from "node:child_process";
import { bold, fail, ok, REPO_ROOT, runSync, warn } from "./common.mjs";

const NIKOLAY_ID = "60000000-0000-0000-0000-000000000001";
const EXPECTED_BALANCE = 3288;

/**
 * Structural guard, not just a warning: every script this reset chains
 * into (infra/db/scripts/{start,migrate,wipe}.sh, via infra/db/env.sh)
 * hardcodes PGHOST=127.0.0.1 and a project-relative PGDATA — there is no
 * env var or flag that redirects them at a remote/production database.
 * This check exists so that remains true even if this script is ever
 * invoked from an unexpected context (e.g. a future CI/deploy wrapper).
 */
function assertLocalDevContext() {
  if (process.env.NODE_ENV === "production") {
    console.error(fail("Refusing to run demo:reset with NODE_ENV=production."));
    process.exit(1);
  }
  const pgHostOverride = process.env.PGHOST;
  if (pgHostOverride && pgHostOverride !== "127.0.0.1" && pgHostOverride !== "localhost") {
    console.error(fail(`Refusing to run: PGHOST is set to "${pgHostOverride}", not a local address.`));
    process.exit(1);
  }
}

function queryBalance() {
  try {
    const out = execFileSync(
      "bash",
      [
        "-c",
        `source infra/db/env.sh && psql -tAc "select coalesce(sum(points), 0) from loyalty_transactions where customer_id = '${NIKOLAY_ID}'"`,
      ],
      { cwd: REPO_ROOT, encoding: "utf8" },
    ).trim();
    return Number(out);
  } catch {
    return null;
  }
}

async function main() {
  assertLocalDevContext();

  console.log(bold("Resetting Lua Platform demo data") + "\n");
  console.log(`Target: 127.0.0.1:54329, database "lua" (infra/db/pgdata — this project's own local cluster only)\n`);

  runSync("bash", ["infra/db/scripts/start.sh"]);
  runSync("bash", ["infra/db/scripts/migrate.sh"]);
  runSync("bash", ["infra/db/scripts/wipe.sh"]);

  console.log();
  const balance = queryBalance();
  if (balance === EXPECTED_BALANCE) {
    console.log(ok(`Verified: Николай (nikolay@lua.dev) starts at exactly ${EXPECTED_BALANCE} points.`));
  } else if (balance === null) {
    console.log(warn("Could not verify Николай's starting balance (query failed) — check infra/db/seed.sql manually."));
  } else {
    console.log(fail(`Николай's balance is ${balance}, expected ${EXPECTED_BALANCE} — check infra/db/seed.sql.`));
    process.exit(1);
  }

  console.log();
  console.log(ok("Demo data reset complete.") + " Run pnpm demo:start (or refresh open tabs) to continue testing.");
}

main().catch((err) => {
  console.error(fail("[demo:reset] unexpected error:"), err);
  process.exit(1);
});
