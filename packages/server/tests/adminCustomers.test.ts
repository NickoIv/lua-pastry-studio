import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, superuserPool, SEED } from "./helpers";

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}
async function loginCustomer(email: string, password: string) {
  const res = await request(app).post("/api/auth/customer/login").send({ email, password });
  return res.body.token as string;
}

describe("Admin customer management", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("the customer list aggregate reports the correct balance/order-count/spend for a known customer", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .get(`/api/admin/customers?q=${encodeURIComponent("Николай")}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const nikolay = res.body.items.find((c: { id: string }) => c.id === SEED.nikolayId);
    expect(nikolay).toBeTruthy();
    expect(nikolay.pointsBalance).toBe(3288);
    expect(nikolay.ordersCount).toBeGreaterThanOrEqual(3);
    expect(nikolay.lifetimeSpend.minorUnits).toBeGreaterThan(0);
  });

  it("customer detail returns the customer's real order history and ledger", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .get(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.pointsBalance).toBe(3288);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.ledger.length).toBeGreaterThan(0);
    expect(res.body.orders[0]).toHaveProperty("items");
  });

  it("a name edit persists", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ firstName: "Николай-Тест" });
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe("Николай-Тест");

    const reread = await request(app)
      .get(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(reread.body.profile.firstName).toBe("Николай-Тест");

    // Restore for later tests/fixtures in this file and other suites.
    await request(app)
      .patch(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ firstName: "Николай" });
  });

  it("a birthday edit round-trips as the exact same calendar date, no timezone shift", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch(`/api/admin/customers/${SEED.secondCustomerId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ birthDate: "1990-01-01" });
    expect(res.status).toBe(200);
    expect(res.body.birthDate).toBe("1990-01-01");

    const raw = await superuserPool.query("select birth_date::text as birth_date from customer_profiles where id = $1", [
      SEED.secondCustomerId,
    ]);
    expect(raw.rows[0].birth_date).toBe("1990-01-01");

    // A late-in-the-year date is the sharpest test of an East-of-UTC
    // shift (Asia/Almaty is UTC+5): a naive `new Date("YYYY-MM-DD")`
    // round-trip would show Dec 31 instead of Jan 1 of the next year.
    const res2 = await request(app)
      .patch(`/api/admin/customers/${SEED.secondCustomerId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ birthDate: "2000-12-31" });
    expect(res2.body.birthDate).toBe("2000-12-31");
  });

  it("Staff's QR scan DTO still doesn't expose birthday or contact details", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const identity = await request(app)
      .post("/api/me/qr/identity")
      .set("Authorization", `Bearer ${customerToken}`);
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const scan = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ token: identity.body.token });
    expect(scan.status).toBe(200);
    const keys = Object.keys(scan.body.customer);
    expect(keys).not.toContain("birthDate");
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("email");
    // No phone at all, not even masked — see docs/ARCHITECTURE.md "Staff privacy".
    expect(keys).not.toContain("maskedPhone");
  });

  it("BARISTA cannot read or edit customer detail", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const getRes = await request(app)
      .get(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${baristaToken}`);
    expect(getRes.status).toBe(403);

    const patchRes = await request(app)
      .patch(`/api/admin/customers/${SEED.nikolayId}`)
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ firstName: "Hacked" });
    expect(patchRes.status).toBe(403);
  });
});
