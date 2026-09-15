/**
 * Central place every app reads runtime configuration from, instead of
 * touching `import.meta.env` directly. Swapping mock data for a real
 * backend later is then a one-line change here, not a search-and-replace
 * across three apps. See docs/ARCHITECTURE.md.
 */
export type DataMode = "mock" | "http";

function readEnv(key: keyof ImportMetaEnv): string | undefined {
  try {
    return import.meta.env?.[key];
  } catch {
    return undefined;
  }
}

export function getDataMode(): DataMode {
  const raw = readEnv("VITE_LUA_DATA_MODE");
  return raw === "http" ? "http" : "mock";
}

export function getQrTokenTtlSeconds(): number {
  const raw = readEnv("VITE_QR_TOKEN_TTL_SECONDS");
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
}

export const APP_CONFIG = {
  dataMode: getDataMode(),
  qrTokenTtlSeconds: getQrTokenTtlSeconds(),
  rewardRedemptionTtlSeconds: getQrTokenTtlSeconds(),
} as const;
