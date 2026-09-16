import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the real local backend (packages/server + Postgres),
 * not mock mode — the whole point is proving Admin writes really persist
 * and Guest really reads them back. Start `pnpm db:reset`,
 * `pnpm dev:server`, `pnpm dev:guest`, `pnpm dev:staff`, `pnpm dev:admin`
 * (each app's .env.local set to VITE_LUA_DATA_MODE=server) before
 * running `pnpm e2e` — see docs/LOCAL-BACKEND.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
