import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, SEED } from "./helpers";

async function loginCustomer(email: string, password: string) {
  const res = await request(app)
    .post("/api/auth/customer/login")
    .send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe("Scenario B — buy a reward with points", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("starts Nikolay at the product brief's example balance of 3 288", async () => {
    const token = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .get("/api/me/loyalty/account")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.pointsBalance).toBe(3288);
  });

  let redemptionId: string;
  let qrToken: string;

  it("requesting a redemption does NOT change the balance", async () => {
    const token = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .post(`/api/me/rewards/${SEED.petitPrinceRewardId}/redeem`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.redemption.status).toBe("PENDING");
    redemptionId = res.body.redemption.id;
    qrToken = res.body.qr.token;

    const account = await request(app)
      .get("/api/me/loyalty/account")
      .set("Authorization", `Bearer ${token}`);
    expect(account.body.pointsBalance).toBe(3288);
  });

  it("staff resolves the reward QR and sees the forecast balance", async () => {
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app)
      .post("/api/staff/qr/resolve")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ token: qrToken });
    expect(res.status).toBe(200);
    expect(res.body.purpose).toBe("REWARD_REDEMPTION");
    expect(res.body.customer.balance).toBe(3288);
    expect(res.body.redemption.pointsCost).toBe(2500);
  });

  it("confirming deducts points exactly once: 3288 - 2500 = 788", async () => {
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const confirm = await request(app)
      .post(`/api/staff/redemptions/${redemptionId}/confirm`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.newBalance).toBe(788);

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const account = await request(app)
      .get("/api/me/loyalty/account")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(account.body.pointsBalance).toBe(788);
  });

  it("a second confirm is rejected and balance stays 788 (idempotency / no double-spend)", async () => {
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const confirm = await request(app)
      .post(`/api/staff/redemptions/${redemptionId}/confirm`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(confirm.status).toBe(400);
    expect(confirm.body.error.code).toBe("REDEMPTION_ALREADY_COMPLETED");

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const account = await request(app)
      .get("/api/me/loyalty/account")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(account.body.pointsBalance).toBe(788);
  });

  it("the fulfilled redemption shows up in Nikolay's history", async () => {
    const token = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .get("/api/me/redemptions")
      .set("Authorization", `Bearer ${token}`);
    const found = res.body.find((r: { id: string }) => r.id === redemptionId);
    expect(found?.status).toBe("FULFILLED");
  });
});

describe("Scenario A — a purchase earns points", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("staff attaches the demo order and Nikolay earns +405 (8 100 KZT @ 5%)", async () => {
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const confirm = await request(app)
      .post(`/api/staff/orders/${SEED.demoOrderId}/confirm-earn`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ customerId: SEED.nikolayId });
    expect(confirm.status).toBe(200);
    expect(confirm.body.order.pointsEarned).toBe(405);
    expect(confirm.body.order.status).toBe("COMPLETED");

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const account = await request(app)
      .get("/api/me/loyalty/account")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(account.body.pointsBalance).toBe(3288 + 405);

    const orders = await request(app)
      .get("/api/me/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(orders.body.some((o: { id: string }) => o.id === SEED.demoOrderId)).toBe(true);
  });

  it("re-confirming the same order is rejected and does not double-earn", async () => {
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const confirm = await request(app)
      .post(`/api/staff/orders/${SEED.demoOrderId}/confirm-earn`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ customerId: SEED.nikolayId });
    expect(confirm.status).toBe(400);
    expect(confirm.body.error.code).toBe("ORDER_ALREADY_REWARDED");

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const account = await request(app)
      .get("/api/me/loyalty/account")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(account.body.pointsBalance).toBe(3288 + 405);
  });
});
