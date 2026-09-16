import type { CorsOptions } from "cors";

/**
 * The only two ways a browser should be allowed to call this API in
 * local development: the three Vite dev servers on localhost (the Mac
 * itself), or the same three ports reached via a private LAN address
 * (a phone on the same Wi-Fi — see docs/LOCAL-BACKEND.md "Cross-device
 * testing"). This is deliberately not `*` — a wide-open CORS_ORIGIN is
 * how LAN testing usually gets "solved" for a demo, but it would allow
 * any website on the internet to script-call this API from a visitor's
 * browser using their locally-stored session token. Requests with no
 * Origin header at all (curl, server-to-server, same-origin) are not
 * something a browser CORS check ever applies to, so they pass through.
 */
const DEV_PORTS = new Set([5173, 5174, 5175]);

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/** RFC 1918 private ranges — what a Mac's Wi-Fi/LAN IP actually looks like, never a specific hardcoded address. */
function isPrivateLanIPv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function isAllowedDevOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if (!DEV_PORTS.has(port)) return false;
  return isLoopbackHost(url.hostname) || isPrivateLanIPv4(url.hostname);
}

/**
 * `CORS_ORIGIN` unset or left at its example value of `*` gets the safe
 * local-dev pattern above. Setting it to anything else (a comma-
 * separated list of explicit origins) switches to a plain allow-list —
 * the shape a real deployment would use once one exists, kept separate
 * from local-dev behavior rather than the same wildcard doing double duty.
 */
export function buildCorsOptions(corsOriginEnv: string): CorsOptions {
  if (corsOriginEnv && corsOriginEnv !== "*") {
    const allowed = corsOriginEnv.split(",").map((s) => s.trim()).filter(Boolean);
    return { origin: allowed };
  }
  return {
    origin(origin, callback) {
      if (!origin || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}
