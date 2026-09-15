/**
 * Central place every app reads runtime configuration from, instead of
 * touching `import.meta.env` directly. Swapping mock data for the real
 * local backend is then a one-line env change (VITE_LUA_DATA_MODE), not
 * a search-and-replace across three apps. See docs/ARCHITECTURE.md and
 * docs/LOCAL-BACKEND.md.
 */
export type DataMode = "mock" | "server";

function readEnv(key: keyof ImportMetaEnv): string | undefined {
  try {
    return import.meta.env?.[key];
  } catch {
    return undefined;
  }
}

export function getDataMode(): DataMode {
  const raw = readEnv("VITE_LUA_DATA_MODE");
  return raw === "server" ? "server" : "mock";
}

/**
 * Defaults to localhost, which only works from the same machine running
 * the server. For a phone on the same Wi-Fi to reach it, set
 * VITE_LUA_API_URL to your Mac's LAN IP — see docs/LOCAL-BACKEND.md
 * "Cross-device testing".
 */
export function getApiBaseUrl(): string {
  return readEnv("VITE_LUA_API_URL") ?? "http://localhost:4000/api";
}

/** Client-side fallback only — the server is the real source of truth for QR TTL (Admin-configurable, see docs/ARCHITECTURE.md §16). */
export function getQrTokenTtlSeconds(): number {
  const raw = readEnv("VITE_QR_TOKEN_TTL_SECONDS");
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
}

export const APP_CONFIG = {
  dataMode: getDataMode(),
  apiBaseUrl: getApiBaseUrl(),
  qrTokenTtlSeconds: getQrTokenTtlSeconds(),
  rewardRedemptionTtlSeconds: getQrTokenTtlSeconds(),
} as const;
