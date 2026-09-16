// Shared helpers for scripts/demo/{doctor,start,stop,reset,open}.mjs —
// the "one-command demo" launcher. Deliberately plain Node (no new
// dependency): it shells out to the same infra/db/scripts/*.sh and
// pnpm dev:* commands a developer would run by hand, and only adds
// what those don't already do — port/health checks, LAN IP detection,
// PID tracking for the four long-running processes, and readable
// console output. See docs/TEST-LUA-LOCALLY.md.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, openSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RUNTIME_DIR = path.join(REPO_ROOT, ".runtime");
export const LOG_DIR = path.join(RUNTIME_DIR, "logs");
export const PID_FILE = path.join(RUNTIME_DIR, "pids.json");

export const PORTS = {
  postgres: 54329,
  api: 4000,
  guest: 5173,
  staff: 5174,
  admin: 5175,
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

const useColor = process.stdout.isTTY;
function color(code, text) {
  return useColor ? `${code}${text}${RESET}` : text;
}

export function ok(text) {
  return color(GREEN, text);
}
export function fail(text) {
  return color(RED, text);
}
export function warn(text) {
  return color(YELLOW, text);
}
export function bold(text) {
  return color(BOLD, text);
}
export function dim(text) {
  return color(DIM, text);
}

/** Right-pads a label with dots, matching the brief's example output shape. */
export function statusLine(label, value, width = 20) {
  const dots = ".".repeat(Math.max(2, width - label.length));
  console.log(`${label} ${dim(dots)} ${value}`);
}

export function ensureRuntimeDir() {
  mkdirSync(LOG_DIR, { recursive: true });
}

export function readPids() {
  try {
    return JSON.parse(readFileSync(PID_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function writePids(pids) {
  ensureRuntimeDir();
  writeFileSync(PID_FILE, JSON.stringify(pids, null, 2));
}

/** true if a process with this PID exists and is still alive (signal 0 doesn't actually kill it). */
export function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Resolves once a TCP connection to the port succeeds/fails — doesn't identify *whose* process it is. */
export function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

export async function waitForPort(port, { timeoutMs = 20_000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(port)) return true;
    await sleep(intervalMs);
  }
  return false;
}

export async function waitForHttpOk(url, { timeoutMs = 20_000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(intervalMs);
  }
  return false;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The Mac's own LAN IPv4 address — the one a phone on the same Wi-Fi
 * can actually reach. Never hardcoded: picked from `os.networkInterfaces()`
 * at run time, preferring a typical private Wi-Fi/Ethernet range and
 * skipping loopback/virtual/link-local interfaces.
 */
export function detectLanIPv4() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      if (addr.address.startsWith("169.254.")) continue; // link-local, not useful
      candidates.push({ name, address: addr.address });
    }
  }
  // Prefer common Mac Wi-Fi/Ethernet interface names if present, else take the first candidate.
  const preferredOrder = ["en0", "en1"];
  for (const preferred of preferredOrder) {
    const match = candidates.find((c) => c.name === preferred);
    if (match) return match.address;
  }
  return candidates[0]?.address ?? null;
}

/** Runs a repo script to completion (e.g. infra/db/scripts/*.sh) and streams its output. */
export function runSync(cmd, args) {
  execFileSync(cmd, args, { cwd: REPO_ROOT, stdio: "inherit" });
}

/**
 * Spawns a long-running dev process (the API server or a Vite dev
 * server) detached from this launcher, with its own log file, and
 * records its PID so a later `demo:stop` (even from a different
 * terminal) can find and stop exactly this process — never anything
 * this project didn't start itself.
 */
export function spawnService(name, command, args) {
  ensureRuntimeDir();
  const logPath = path.join(LOG_DIR, `${name}.log`);
  const fd = openSync(logPath, "w"); // overwrite each start — see docs/TEST-LUA-LOCALLY.md "Logs"
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", fd, fd],
    env: process.env,
  });
  child.unref();
  const pids = readPids();
  pids[name] = child.pid;
  writePids(pids);
  return { pid: child.pid, logPath };
}

export function stopPid(pid) {
  if (!isPidAlive(pid)) return;
  try {
    // Negative pid signals the whole process group — `detached: true` at
    // spawn time made each service the leader of its own group, so this
    // also reaps any child processes vite/tsx themselves spawn, not just
    // the wrapper we tracked.
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

export function logPathFor(name) {
  return path.join(LOG_DIR, `${name}.log`);
}
