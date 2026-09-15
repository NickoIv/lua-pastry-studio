import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Every test file resets and reuses the same local dev Postgres
    // database — running files in parallel would race each other's
    // resets. See tests/helpers.ts.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
