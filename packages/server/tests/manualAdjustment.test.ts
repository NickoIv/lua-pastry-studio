import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, superuserPool, SEED } from "./helpers";

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}

describe("Manual loyalty adjustment", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("+500 creates a new manual_adjustment ledger row, not a balance overwrite", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const before = await superuserPool.query(
      "select count(*) from loyalty_transactions where customer_id = $1",
      [SEED.nikolayId],
    );

    const res = await request(app)
      .post(`/api/admin/customers/${SEED.nikolayId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 500, reason: "Компенсация за ошибку" });
    expect(res.status).toBe(201);
    expect(res.body.transaction.points).toBe(500);
    expect(res.body.newBalance).toBe(3788);

    // Seed already carries one manual_adjustment row for Nikolay (a
    // "migrated from the old loyalty program" entry — see
    // infra/db/seed.sql) — this asserts exactly one *new* one landed.
    const after = await superuserPool.query(
      "select count(*) from loyalty_transactions where customer_id = $1 and type = 'manual_adjustment'",
      [SEED.nikolayId],
    );
    expect(Number(after.rows[0].count)).toBe(2);

    const countAfter = await superuserPool.query(
      "select count(*) from loyalty_transactions where customer_id = $1",
      [SEED.nikolayId],
    );
    expect(Number(countAfter.rows[0].count)).toBe(Number(before.rows[0].count) + 1);
  });

  it("the balance change matches exactly (+500)", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const detail = await request(app)
      .get(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(detail.body.pointsBalance).toBe(3788);
  });

  it("reason is mandatory", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post(`/api/admin/customers/${SEED.nikolayId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 100 });
    expect(res.status).toBe(422);
  });

  it("a resulting negative balance is blocked", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post(`/api/admin/customers/${SEED.secondCustomerId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: -50, reason: "Would go negative" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_POINTS");
  });

  it("BARISTA is forbidden from adjusting points", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app)
      .post(`/api/admin/customers/${SEED.nikolayId}/adjust-points`)
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ points: 100, reason: "Should be blocked" });
    expect(res.status).toBe(403);
  });

  it("the adjustment is recorded in the audit log", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    await request(app)
      .post(`/api/admin/customers/${SEED.nikolayId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 10, reason: "Аудит-проверка корректировки" });

    const log = await request(app)
      .get("/api/admin/audit-log?action=loyalty.manual_adjustment")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(log.body.items.some((e: { summary: string }) => e.summary.includes("Аудит-проверка"))).toBe(true);
  });

  it("a retried request with the same idempotency key does not duplicate the transaction", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const idempotencyKey = "test-idempotency-key-1";
    const first = await request(app)
      .post(`/api/admin/customers/${SEED.secondCustomerId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 300, reason: "Idempotent test", idempotencyKey });
    expect(first.status).toBe(201);
    expect(first.body.replayed).toBe(false);

    const second = await request(app)
      .post(`/api/admin/customers/${SEED.secondCustomerId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 300, reason: "Idempotent test", idempotencyKey });
    expect(second.status).toBe(201);
    expect(second.body.replayed).toBe(true);
    expect(second.body.transaction.id).toBe(first.body.transaction.id);

    const count = await superuserPool.query(
      "select count(*) from loyalty_transactions where idempotency_key = $1",
      [idempotencyKey],
    );
    expect(Number(count.rows[0].count)).toBe(1);
  });
});
