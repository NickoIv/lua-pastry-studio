#!/usr/bin/env node
// `pnpm demo:open` — opens Guest, Staff, and Admin in the default
// browser, in that order, one `open` call each. Doesn't start anything;
// run pnpm demo:start first.
import { execFileSync } from "node:child_process";
import { PORTS, bold, dim, warn } from "./common.mjs";

const targets = [
  ["Guest", PORTS.guest],
  ["Staff", PORTS.staff],
  ["Admin", PORTS.admin],
];

console.log(bold("Opening Lua Platform in your browser") + "\n");

if (process.platform !== "darwin") {
  console.log(warn("This command uses macOS's `open`; on another OS, open the URLs printed by pnpm demo:start manually."));
  process.exit(0);
}

for (const [name, port] of targets) {
  const url = `http://localhost:${port}`;
  try {
    execFileSync("open", [url]);
    console.log(dim(`${name}: ${url}`));
  } catch {
    console.log(warn(`Could not open ${name} automatically — open ${url} by hand.`));
  }
}
