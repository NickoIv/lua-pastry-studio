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
 * `VITE_LUA_API_URL` is an explicit override (a non-default port, a
 * tunnel, a future deployment) — most local dev setups shouldn't need
 * to set it at all. Left unset, this derives the API origin from
 * whatever host the page itself was loaded from: `localhost` on the Mac
 * stays `localhost`, and a phone that opened Guest via the Mac's LAN IP
 * (`http://192.168.1.42:5173`) gets `http://192.168.1.42:4000` — the one
 * address a phone can actually reach — with zero configuration and
 * without ever hardcoding a specific IP into source code. See
 * docs/LOCAL-BACKEND.md "Cross-device testing".
 */
export function getApiBaseUrl(): string {
  const explicit = readEnv("VITE_LUA_API_URL");
  if (explicit) return explicit;
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  return "http://localhost:4000/api";
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

/**
 * `packages/server`'s media routes (packages/server/src/routes/media.ts)
 * return a server-relative URL like `/media/product/<id>.webp` — it has
 * no reliable way to know its own externally-reachable origin (that
 * changes for LAN/phone testing, see docs/LOCAL-BACKEND.md "Cross-device
 * testing"). Resolving it against the *client's* configured API origin
 * here means a relative media URL always loads from wherever this app
 * is actually pointed at, not wherever it happens to be running from.
 * An already-absolute URL (an admin-pasted external image) passes through unchanged.
 */
export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (APP_CONFIG.dataMode !== "server") return url;
  try {
    return new URL(url, APP_CONFIG.apiBaseUrl).toString();
  } catch {
    return url;
  }
}
