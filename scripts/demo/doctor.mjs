#!/usr/bin/env node
// `pnpm demo:doctor` — a preflight check, never changes anything.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  REPO_ROOT,
  PORTS,
  bold,
  detectLanIPv4,
  dim,
  fail,
  isPortOpen,
  ok,
  readPids,
  isPidAlive,
  statusLine,
  warn,
} from "./common.mjs";

const PG_BIN_CANDIDATES = ["/opt/homebrew/opt/postgresql@16/bin", "/usr/local/opt/postgresql@16/bin"];

let problems = 0;
let notices = [];

function report(label, passed, okText, failText, { warnOnly = false } = {}) {
  if (passed) {
    statusLine(label, ok(okText));
  } else {
    statusLine(label, warnOnly ? warn(failText) : fail(failText));
    if (!warnOnly) problems += 1;
  }
}

console.log(bold("Lua Platform Demo Check"));
console.log();

// ---- macOS -----------------------------------------------------------
report("Platform", os.platform() === "darwin", "macOS", `unsupported (${os.platform()}) — this launcher assumes macOS`, {
  warnOnly: true,
});

// ---- Node ---------------------------------------------------------------
const nodeMajor = Number(process.versions.node.split(".")[0]);
report("Node.js", nodeMajor >= 20, `OK (v${process.versions.node})`, `too old (v${process.versions.node}, need >= 20)`);

// ---- pnpm -----------------------------------------------------------------
let pnpmVersion = null;
try {
  pnpmVersion = execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim();
} catch {
  // stays null — reported as "not found" below
}
report("pnpm", Boolean(pnpmVersion), `OK (${pnpmVersion})`, "not found on PATH — see https://pnpm.io/installation");

// ---- Postgres binaries ----------------------------------------------------
const pgBin = PG_BIN_CANDIDATES.find((dir) => existsSync(path.join(dir, "pg_ctl")));
report(
  "PostgreSQL binaries",
  Boolean(pgBin),
  `OK (${pgBin})`,
  "postgresql@16 not found — run: brew install postgresql@16",
);

// ---- Local DB cluster directory -------------------------------------------
const pgDataDir = path.join(REPO_ROOT, "infra", "db", "pgdata");
const pgDataExists = existsSync(pgDataDir);
report(
  "Database cluster dir",
  pgDataExists,
  "OK (initialized)",
  "not initialized yet — pnpm demo:start will create it",
  { warnOnly: true },
);

// ---- Port 54329 (Postgres) --------------------------------------------
const pgPortOpen = await isPortOpen(PORTS.postgres);
report(
  "Database port",
  true,
  pgPortOpen ? `${PORTS.postgres} in use (likely our Postgres)` : `${PORTS.postgres} free`,
  "",
);

// ---- Env files --------------------------------------------------------
const serverEnvExists = existsSync(path.join(REPO_ROOT, "packages/server/.env"));
report(
  "Server env file",
  serverEnvExists,
  "OK (packages/server/.env)",
  "missing — pnpm demo:start creates it from .env.example automatically",
  { warnOnly: true },
);

for (const app of ["guest", "staff", "admin"]) {
  const envPath = path.join(REPO_ROOT, `apps/${app}/.env.local`);
  const exists = existsSync(envPath);
  report(
    `${app[0].toUpperCase()}${app.slice(1)} env file`,
    exists,
    "OK",
    "missing — pnpm demo:start creates it automatically",
    { warnOnly: true },
  );
}

// ---- Service ports ------------------------------------------------------
const pids = readPids();
for (const [name, port] of [
  ["API port", PORTS.api],
  ["Guest port", PORTS.guest],
  ["Staff port", PORTS.staff],
  ["Admin port", PORTS.admin],
]) {
  const key = name.split(" ")[0].toLowerCase();
  const open = await isPortOpen(port);
  const trackedPid = pids[key];
  if (!open) {
    statusLine(name, dim(`${port} free`));
  } else if (isPidAlive(trackedPid)) {
    statusLine(name, ok(`${port} in use by our demo (pid ${trackedPid})`));
  } else {
    statusLine(name, fail(`${port} in use by another process — stop it or pick a different port`));
    problems += 1;
  }
}

// ---- LAN IP -------------------------------------------------------------
const lanIp = detectLanIPv4();
statusLine("LAN address", lanIp ? ok(lanIp) : warn("not detected (no active Wi-Fi/Ethernet?)"));
if (!lanIp) notices.push("No LAN IPv4 address detected — phone testing needs the Mac on Wi-Fi/Ethernet.");

console.log();
if (problems === 0) {
  console.log(ok("Ready to start.") + " Run: pnpm demo:start");
} else {
  console.log(fail(`${problems} problem(s) found above.`) + " Fix them, then re-run pnpm demo:doctor.");
}
for (const notice of notices) {
  console.log(warn("Note: ") + notice);
}

process.exit(problems === 0 ? 0 : 1);
