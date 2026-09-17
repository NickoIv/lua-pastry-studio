import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
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

describe("RBAC / security", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("a customer cannot read another customer's orders (RLS scopes to their own rows)", async () => {
    const otherToken = await loginCustomer("aizhan@lua.dev", "LuaGuest123!");
    const res = await request(app)
      .get("/api/me/orders")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(
      res.body.every((o: { customerId?: string }) => o.customerId !== SEED.nikolayId),
    ).toBe(true);
  });

  it("a customer cannot fetch another customer's order by id (404, not leaked)", async () => {
    const otherToken = await loginCustomer("aizhan@lua.dev", "LuaGuest123!");
    const res = await request(app)
      .get(`/api/me/orders/${SEED.demoOrderId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("a customer cannot read another customer's loyalty ledger", async () => {
    const rows = await superuserPool.query(
      "select id from loyalty_transactions where customer_id = $1 limit 1",
      [SEED.nikolayId],
    );
    const otherToken = await loginCustomer("aizhan@lua.dev", "LuaGuest123!");
    const res = await request(app)
      .get("/api/me/loyalty/transactions")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    const leaked = res.body.some((tx: { id: string }) => tx.id === rows.rows[0]?.id);
    expect(leaked).toBe(false);
  });

  it("a customer token cannot call the staff-only confirm-earn endpoint", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .post(`/api/staff/orders/${SEED.demoOrderId}/confirm-earn`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ customerId: SEED.nikolayId });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("a BARISTA cannot update the loyalty program (admin-only)", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app)
      .patch("/api/admin/loyalty/program")
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ earnRatePerCurrencyUnit: 0.5 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("a BARISTA cannot read the admin customers list", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app)
      .get("/api/admin/customers")
      .set("Authorization", `Bearer ${baristaToken}`);
    expect(res.status).toBe(403);
  });

  it("an ADMIN can update the loyalty program", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch("/api/admin/loyalty/program")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ birthdayBonusPoints: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.birthdayBonusPoints).toBe(1500);
  });

  it("an unauthenticated request cannot resolve a QR / get a customer scan summary", async () => {
    const res = await request(app)
      .post("/api/staff/qr/resolve")
      .send({ token: "anything" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("staff never receives a customer's raw phone/email, or any phone number at all — only the minimal DTO", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const issued = await request(app)
      .post("/api/me/qr/identity")
      .set("Authorization", `Bearer ${customerToken}`);
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const resolved = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ token: issued.body.token });

    // No phone field at all (not even masked) — Staff doesn't need a
    // customer's phone number for a normal QR operation, see
    // docs/ARCHITECTURE.md "Staff privacy".
    const keys = Object.keys(resolved.body.customer);
    expect(keys.sort()).toEqual(["balance", "displayName", "id"]);
    expect(JSON.stringify(resolved.body)).not.toContain("701 234 56 78");
    expect(JSON.stringify(resolved.body)).not.toMatch(/phone/i);
  });

  it("a wrong password is rejected without revealing whether the email exists", async () => {
    const res = await request(app)
      .post("/api/auth/customer/login")
      .send({ email: SEED.nikolayEmail, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("Loyalty domain invariants over the real DB", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("rejects a redemption request when the balance is insufficient", async () => {
    await superuserPool.query(
      `insert into rewards (id, title, points_cost, is_active) values
       ('79000000-0000-0000-0000-000000000001', '{"ru":"Дорогая награда"}', 999999, true)`,
    );
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .post("/api/me/rewards/79000000-0000-0000-0000-000000000001/redeem")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_POINTS");
  });

  it("rejects redeeming an inactive reward", async () => {
    await superuserPool.query(
      `insert into rewards (id, title, points_cost, is_active) values
       ('79000000-0000-0000-0000-000000000002', '{"ru":"Выключенная награда"}', 100, false)`,
    );
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .post("/api/me/rewards/79000000-0000-0000-0000-000000000002/redeem")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("REWARD_INACTIVE");
  });
});
