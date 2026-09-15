import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { digestToken, generateRawToken } from "../src/qr";
import { app, resetDatabase, superuserPool, SEED } from "./helpers";

async function loginCustomer(email: string, password: string) {
  const res = await request(app)
    .post("/api/auth/customer/login")
    .send({ email, password });
  return res.body.token as string;
}

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}

describe("QR token handling", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("a fresh identity token resolves successfully", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const issued = await request(app)
      .post("/api/me/qr/identity")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(issued.status).toBe(200);

    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const resolved = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ token: issued.body.token });
    expect(resolved.status).toBe(200);
    expect(resolved.body.purpose).toBe("IDENTITY");
    expect(resolved.body.customer.id).toBe(SEED.nikolayId);
  });

  it("a random, never-issued token is rejected as QR_INVALID", async () => {
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const resolved = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ token: generateRawToken() });
    expect(resolved.status).toBe(400);
    expect(resolved.body.error.code).toBe("QR_INVALID");
  });

  it("an expired token is rejected as QR_EXPIRED", async () => {
    const rawToken = generateRawToken();
    await superuserPool.query(
      `insert into qr_sessions (token_digest, purpose, customer_id, expires_at)
       values ($1, 'IDENTITY', $2, now() - interval '10 seconds')`,
      [digestToken(rawToken), SEED.nikolayId],
    );

    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const resolved = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ token: rawToken });
    expect(resolved.status).toBe(400);
    expect(resolved.body.error.code).toBe("QR_EXPIRED");
  });

  it("an already-used reward token is rejected as QR_USED", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const redeemed = await request(app)
      .post(`/api/me/rewards/${SEED.petitPrinceRewardId}/redeem`)
      .set("Authorization", `Bearer ${customerToken}`);
    const qrToken = redeemed.body.qr.token as string;

    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const confirmed = await request(app)
      .post(`/api/staff/redemptions/${redeemed.body.redemption.id}/confirm`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(confirmed.status).toBe(200);

    const resolved = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ token: qrToken });
    expect(resolved.status).toBe(400);
    expect(resolved.body.error.code).toBe("QR_USED");
  });

  it("the raw token is never stored — only its digest is, and it never appears in the customer_profiles/orders tables", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const issued = await request(app)
      .post("/api/me/qr/identity")
      .set("Authorization", `Bearer ${customerToken}`);
    const rawToken = issued.body.token as string;

    const digest = digestToken(rawToken);
    expect(digest).not.toBe(rawToken);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);

    const rows = await superuserPool.query(
      "select token_digest from qr_sessions where token_digest = $1",
      [digest],
    );
    expect(rows.rowCount).toBe(1);

    const columns = await superuserPool.query(
      "select column_name from information_schema.columns where table_name = 'qr_sessions'",
    );
    const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name);
    expect(columnNames).not.toContain("raw_token");
    expect(columnNames).not.toContain("token");
  });
});
