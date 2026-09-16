import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errors";

/**
 * In-memory fixed-window rate limiter — a single Node process's Map, not
 * a distributed store. That's the right trade-off for a local dev
 * server with one process, and explicitly NOT what a real deployment
 * should ship: running more than one server instance (or behind a
 * load balancer) needs a shared store (Redis, or the platform's own
 * rate limiting — e.g. a reverse proxy/API gateway) instead, since each
 * process would otherwise track its own independent counters. See
 * docs/ARCHITECTURE.md "Rate limiting".
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Only for tests: lets a suite assert "the next request is blocked"
// without needing to wait out a real window.
export function resetRateLimitState() {
  buckets.clear();
}

export interface RateLimitOptions {
  /** Identifies the limiter (combined with the caller key to form the bucket key). */
  name: string;
  windowMs: number;
  max: number;
  /** How to key the bucket — defaults to remote IP. */
  keyFn?: (req: Request) => string;
}

export function rateLimit(options: RateLimitOptions) {
  const { name, windowMs, max } = options;
  const keyFn = options.keyFn ?? ((req: Request) => req.ip ?? "unknown");

  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${name}:${keyFn(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      next(new AppError("RATE_LIMITED", 429));
      return;
    }

    bucket.count += 1;
    next();
  };
}

/** Keys by the authenticated session (customer or staff) instead of IP, for endpoints that always require auth. */
export function sessionKey(req: Request): string {
  if (req.session?.kind === "customer") return `customer:${req.session.sub}`;
  if (req.session?.kind === "staff") return `staff:${req.session.sub}`;
  return `ip:${req.ip ?? "unknown"}`;
}
