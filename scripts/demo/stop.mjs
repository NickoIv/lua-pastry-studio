#!/usr/bin/env node
// `pnpm demo:stop` — stops only the processes this launcher itself
// started (tracked by PID in .runtime/pids.json), plus this project's
// own local Postgres cluster. Never touches any other Node/Postgres
// process on the machine.
import { bold, dim, isPidAlive, ok, PID_FILE, readPids, runSync, sleep, stopPid } from "./common.mjs";
import { existsSync, rmSync } from "node:fs";

async function main() {
  console.log(bold("Stopping Lua Platform demo environment") + "\n");

  const pids = readPids();
  let stoppedAny = false;
  for (const [name, pid] of Object.entries(pids)) {
    if (isPidAlive(pid)) {
      stopPid(pid);
      stoppedAny = true;
      console.log(ok(`stopped ${name} (pid ${pid})`));
    } else {
      console.log(dim(`${name} was not running`));
    }
  }
  if (stoppedAny) {
    await sleep(500); // let SIGTERM land before we move on
  }
  if (existsSync(PID_FILE)) rmSync(PID_FILE);

  console.log();
  console.log(bold("Database"));
  runSync("bash", ["infra/db/scripts/stop.sh"]);

  console.log();
  console.log(ok("Lua Platform demo environment stopped."));
}

main().catch((err) => {
  console.error("[demo:stop] unexpected error:", err);
  process.exit(1);
});
