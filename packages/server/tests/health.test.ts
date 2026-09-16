import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers";

/**
 * `demo:start` (scripts/demo/start.mjs) polls this endpoint to know when
 * the backend is actually ready to serve requests, not just that the
 * Node process started — see docs/LOCAL-BACKEND.md.
 */
describe("GET /health", () => {
  it("reports ok and a connected database, with no secrets in the body", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: "connected", version: expect.any(String) });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/postgres:\/\//i);
    expect(serialized.toLowerCase()).not.toContain("secret");
    expect(serialized.toLowerCase()).not.toContain("password");
  });
});
