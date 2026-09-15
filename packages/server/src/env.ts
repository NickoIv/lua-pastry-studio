try {
  // Node 20.6+ native .env loader — packages/server/.env is gitignored;
  // see packages/server/.env.example.
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // No .env file yet — fine, env.ts below falls back to local dev defaults.
}

/**
 * Local-dev-only configuration. There is no production deployment story
 * for this server yet — see docs/LOCAL-BACKEND.md. JWT_SECRET must never
 * be the fallback below outside a throwaway local database.
 */
export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl:
    process.env.DATABASE_URL ??
    `postgres://app_server@127.0.0.1:${process.env.LUA_PG_PORT ?? "54329"}/lua`,
  jwtSecret: process.env.JWT_SECRET ?? "lua-local-dev-secret-do-not-use-in-production",
  qrTokenTtlSeconds: Number(process.env.QR_TOKEN_TTL_SECONDS ?? 90),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};

if (env.jwtSecret === "lua-local-dev-secret-do-not-use-in-production") {
  // Loud, not silent — this is fine for a throwaway local dev database
  // but must never be true anywhere reachable by anyone else.
  console.warn(
    "[lua-server] Using the default local dev JWT_SECRET. Set a real one in packages/server/.env before exposing this server beyond your own machine.",
  );
}
