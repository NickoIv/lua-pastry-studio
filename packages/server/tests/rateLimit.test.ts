import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { rateLimit, resetRateLimitState } from "../src/rateLimit";
import { app, resetDatabase, SEED } from "./helpers";

function buildTestApp() {
  const app = express();
  app.get("/limited", rateLimit({ name: "test-limit", windowMs: 60_000, max: 3 }), (_req, res) =>
    res.json({ ok: true }),
  );
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const appError = err as { code?: string; status?: number };
    res.status(appError.status ?? 500).json({ error: { code: appError.code ?? "INTERNAL" } });
  });
  return app;
}

describe("rateLimit middleware", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("allows requests up to the configured max", async () => {
    const app = buildTestApp();
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/limited");
      expect(res.status).toBe(200);
    }
  });

  it("blocks the request after the max is exceeded, with a typed RATE_LIMITED error", async () => {
    const app = buildTestApp();
    for (let i = 0; i < 3; i++) {
      await request(app).get("/limited");
    }
    const blocked = await request(app).get("/limited");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
  });

  it("tracks separate callers (by IP here) independently", async () => {
    const app = buildTestApp();
    // supertest requests from the same test process share the same
    // loopback IP, so this exercises the keyFn default path itself
    // rather than proving per-IP isolation — see the session-keyed test
    // below for a case with two distinct keys.
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/limited");
      expect(res.status).toBe(200);
    }
  });

  it("a fresh window (after resetRateLimitState) is not affected by a previous run", async () => {
    const app = buildTestApp();
    for (let i = 0; i < 3; i++) await request(app).get("/limited");
    await request(app).get("/limited");
    resetRateLimitState();
    const res = await request(app).get("/limited");
    expect(res.status).toBe(200);
  });
});

describe("rateLimit with a session-based key", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("keys two different callers independently, so one being limited does not affect the other", async () => {
    const app = express();
    let currentKey = "customer:a";
    app.use((req, _res, next) => {
      // Simulate two distinct authenticated sessions across requests.
      (req as unknown as { session: { kind: string; sub: string } }).session = {
        kind: "customer",
        sub: currentKey,
      };
      next();
    });
    app.get(
      "/limited",
      rateLimit({
        name: "session-limit",
        windowMs: 60_000,
        max: 2,
        keyFn: (req) => (req as unknown as { session: { sub: string } }).session.sub,
      }),
      (_req, res) => res.json({ ok: true }),
    );
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const appError = err as { code?: string; status?: number };
      res.status(appError.status ?? 500).json({ error: { code: appError.code ?? "INTERNAL" } });
    });

    currentKey = "customer:a";
    await request(app).get("/limited");
    await request(app).get("/limited");
    const aBlocked = await request(app).get("/limited");
    expect(aBlocked.status).toBe(429);

    currentKey = "customer:b";
    const bOk = await request(app).get("/limited");
    expect(bOk.status).toBe(200);
  });
});

describe("QR issue rate limiting is really wired onto the live endpoint", () => {
  beforeAll(() => {
    resetDatabase();
  });
  afterAll(() => {
    resetRateLimitState();
  });

  it("excessive /me/qr/identity requests are blocked; normal usage is unaffected", async () => {
    const login = await request(app)
      .post("/api/auth/customer/login")
      .send({ email: SEED.nikolayEmail, password: SEED.nikolayPassword });
    const token = login.body.token as string;

    // The route's configured max is 30/60s — well above what a real
    // guest session issues, but low enough to exceed in a test.
    for (let i = 0; i < 30; i++) {
      const res = await request(app).post("/api/me/qr/identity").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).post("/api/me/qr/identity").set("Authorization", `Bearer ${token}`);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");

    // A different customer's own requests are unaffected by Nikolay's limit.
    const otherLogin = await request(app)
      .post("/api/auth/customer/login")
      .send({ email: "aizhan@lua.dev", password: "LuaGuest123!" });
    const otherRes = await request(app)
      .post("/api/me/qr/identity")
      .set("Authorization", `Bearer ${otherLogin.body.token}`);
    expect(otherRes.status).toBe(200);
  });
});
