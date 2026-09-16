#!/usr/bin/env node
// `pnpm demo:start` — brings up Postgres, the API, and all three apps
// with one command. Idempotent: re-running it while things are already
// up just confirms they're healthy instead of spawning duplicates.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  PORTS,
  REPO_ROOT,
  bold,
  detectLanIPv4,
  dim,
  fail,
  isPidAlive,
  isPortOpen,
  ok,
  readPids,
  runSync,
  spawnService,
  waitForHttpOk,
  warn,
} from "./common.mjs";

const APP_ENV_DEFAULTS = "VITE_LUA_DATA_MODE=server\n" +
  "# VITE_LUA_API_URL intentionally left unset — the app derives the API\n" +
  "# origin from whatever host the page was opened from. Set it explicitly\n" +
  "# only to point at a non-default API port or a tunnel.\n";

function ensureEnvFiles() {
  const serverEnv = path.join(REPO_ROOT, "packages/server/.env");
  if (!existsSync(serverEnv)) {
    copyFileSync(path.join(REPO_ROOT, "packages/server/.env.example"), serverEnv);
    console.log(dim("[demo:start] created packages/server/.env from .env.example"));
  }
  for (const app of ["guest", "staff", "admin"]) {
    const envPath = path.join(REPO_ROOT, `apps/${app}/.env.local`);
    if (!existsSync(envPath)) {
      writeFileSync(envPath, APP_ENV_DEFAULTS);
      console.log(dim(`[demo:start] created apps/${app}/.env.local`));
    }
  }
}

async function ensureDatabase() {
  console.log(bold("Database"));
  runSync("bash", ["infra/db/scripts/start.sh"]);
  runSync("bash", ["infra/db/scripts/migrate.sh"]);

  const countRaw = execCount();
  const isEmpty = countRaw === null || countRaw === "0";
  if (isEmpty) {
    console.log(dim("[demo:start] database looks empty — loading seed data"));
    runSync("bash", ["infra/db/scripts/seed.sh"]);
  } else {
    console.log(dim("[demo:start] existing demo data found — leaving it as-is (use pnpm demo:reset to start fresh)"));
  }
}

function execCount() {
  try {
    return execFileSync(
      "bash",
      ["-c", "source infra/db/env.sh && psql -tAc \"select count(*) from locations\""],
      { cwd: REPO_ROOT, encoding: "utf8" },
    ).trim();
  } catch {
    return null;
  }
}

/** true if this service is already up and it's ours (safe to skip spawning a duplicate). */
async function alreadyRunning(name, port) {
  const open = await isPortOpen(port);
  if (!open) return { running: false, foreign: false };
  const pids = readPids();
  return { running: isPidAlive(pids[name]), foreign: !isPidAlive(pids[name]) };
}

async function startApi() {
  console.log(bold("Backend API"));
  const { running, foreign } = await alreadyRunning("api", PORTS.api);
  if (running) {
    console.log(dim(`[demo:start] API already running on ${PORTS.api}`));
  } else if (foreign) {
    console.log(fail(`[demo:start] port ${PORTS.api} is used by another process — not starting a second API`));
    return false;
  } else {
    spawnService("api", "pnpm", ["--filter", "@lua/server", "start"]);
  }
  const healthy = await waitForHttpOk(`http://127.0.0.1:${PORTS.api}/health`, { timeoutMs: 25_000 });
  if (!healthy) {
    console.log(fail(`[demo:start] API did not become healthy in time — see .runtime/logs/api.log`));
    return false;
  }
  console.log(ok("[demo:start] API is healthy"));
  return true;
}

async function startFrontend(name, port) {
  const { running, foreign } = await alreadyRunning(name, port);
  if (running) {
    console.log(dim(`[demo:start] ${name} already running on ${port}`));
    return true;
  }
  if (foreign) {
    console.log(fail(`[demo:start] port ${port} is used by another process — not starting ${name}`));
    return false;
  }
  spawnService(name, "pnpm", ["--filter", `@lua/${name}`, "dev"]);
  const up = await waitForHttpOk(`http://127.0.0.1:${port}/`, { timeoutMs: 20_000 });
  if (!up) {
    console.log(fail(`[demo:start] ${name} did not come up in time — see .runtime/logs/${name}.log`));
    return false;
  }
  console.log(ok(`[demo:start] ${name} is up`));
  return true;
}

async function main() {
  console.log(bold("Starting Lua Platform demo environment") + "\n");

  ensureEnvFiles();
  await ensureDatabase();

  console.log();
  const apiOk = await startApi();
  if (!apiOk) {
    console.log(fail("\nStartup aborted — fix the backend first, then re-run pnpm demo:start."));
    process.exit(1);
  }

  console.log();
  console.log(bold("Frontends"));
  const results = await Promise.all([
    startFrontend("guest", PORTS.guest),
    startFrontend("staff", PORTS.staff),
    startFrontend("admin", PORTS.admin),
  ]);
  if (results.some((r) => !r)) {
    console.log(fail("\nOne or more frontends failed to start — see logs above and .runtime/logs/."));
    process.exit(1);
  }

  const lanIp = detectLanIPv4();

  console.log();
  console.log(bold("Lua Platform is ready"));
  console.log();
  console.log(bold("Guest:"));
  console.log(`  http://localhost:${PORTS.guest}`);
  console.log();
  console.log(bold("Staff:"));
  console.log(`  http://localhost:${PORTS.staff}`);
  console.log();
  console.log(bold("Admin:"));
  console.log(`  http://localhost:${PORTS.admin}`);
  console.log();
  if (lanIp) {
    console.log(bold("Guest on your phone (same Wi-Fi):"));
    console.log(`  http://${lanIp}:${PORTS.guest}`);
  } else {
    console.log(warn("Guest on your phone: no LAN IP detected — connect the Mac to Wi-Fi/Ethernet and re-run."));
  }
  console.log();
  console.log(bold("Backend:"));
  console.log(`  http://localhost:${PORTS.api}`);
  console.log();
  console.log(bold("── DEVELOPMENT-ONLY demo accounts ──"));
  console.log("  Guest:  nikolay@lua.dev / LuaGuest123!");
  console.log("  Staff:  aigerim@lua.dev / LuaStaff123!   (BARISTA)");
  console.log("  Admin:  dana@lua.dev / LuaStaff123!      (ADMIN)");
  console.log(dim("  Full list: docs/TEST-LUA-LOCALLY.md"));
  console.log();
  console.log(dim("Logs: .runtime/logs/   Stop: pnpm demo:stop   Reset data: pnpm demo:reset"));
}

main().catch((err) => {
  console.error(fail("[demo:start] unexpected error:"), err);
  process.exit(1);
});
