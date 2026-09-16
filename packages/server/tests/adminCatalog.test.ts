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

const COFFEE_CATEGORY_ID = "20000000-0000-0000-0000-000000000001";
const CAPPUCCINO_REWARD_ID = "70000000-0000-0000-0000-000000000001";

describe("Admin catalog CMS", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("ADMIN can create a product and it persists to Postgres", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: { ru: "Раф кофе", en: "Raf coffee" },
        description: { ru: "Нежный раф на ванильном сиропе." },
        categoryId: COFFEE_CATEGORY_ID,
        price: 2400,
        isNew: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.price.minorUnits).toBe(240000);
    expect(res.body.active).toBe(true);

    const list = await request(app).get("/api/admin/products").set("Authorization", `Bearer ${adminToken}`);
    expect(list.body.some((p: { id: string }) => p.id === res.body.id)).toBe(true);
  });

  it("BARISTA is forbidden from creating a product", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ name: { ru: "Тест" }, categoryId: COFFEE_CATEGORY_ID, price: 1000 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("SHIFT_MANAGER is also forbidden from writing the catalog", async () => {
    const shiftManagerToken = await loginStaff("yerlan@lua.dev", "LuaStaff123!");
    const res = await request(app)
      .patch(`/api/admin/rewards/${CAPPUCCINO_REWARD_ID}`)
      .set("Authorization", `Bearer ${shiftManagerToken}`)
      .send({ pointsCost: 1 });
    expect(res.status).toBe(403);
  });

  it("a newly created product is immediately visible to Guest", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const created = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Гость видит это" }, categoryId: COFFEE_CATEGORY_ID, price: 1500 });

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const guestMenu = await request(app).get("/api/menu/products").set("Authorization", `Bearer ${customerToken}`);
    expect(guestMenu.body.some((p: { id: string }) => p.id === created.body.id)).toBe(true);
  });

  it("archiving a product (active=false) hides it from Guest but keeps it in the admin list", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const created = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Скоро архивный" }, categoryId: COFFEE_CATEGORY_ID, price: 1500 });

    const archived = await request(app)
      .patch(`/api/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false });
    expect(archived.status).toBe(200);
    expect(archived.body.active).toBe(false);

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const guestMenu = await request(app).get("/api/menu/products").set("Authorization", `Bearer ${customerToken}`);
    expect(guestMenu.body.some((p: { id: string }) => p.id === created.body.id)).toBe(false);

    const adminList = await request(app).get("/api/admin/products").set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.body.some((p: { id: string }) => p.id === created.body.id)).toBe(true);
  });

  it("archiving a historical order's product keeps that order's history readable", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    // "Капучино" is referenced by seeded historical orders/order_items.
    const cappuccinoProductId = "30000000-0000-0000-0000-000000000002";
    await request(app)
      .patch(`/api/admin/products/${cappuccinoProductId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false });

    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const orders = await request(app).get("/api/me/orders").set("Authorization", `Bearer ${customerToken}`);
    expect(orders.status).toBe(200);
    const orderWithCappuccino = orders.body.find((o: { items: Array<{ productName: string }> }) =>
      o.items.some((i) => i.productName === "Капучино"),
    );
    expect(orderWithCappuccino).toBeTruthy();
  });

  it("rejects creating a category with no Russian name", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { en: "No Russian name" } });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("deleting a category that still has products is rejected as CATEGORY_IN_USE, not a raw DB error", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .delete(`/api/admin/categories/${COFFEE_CATEGORY_ID}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CATEGORY_IN_USE");
  });

  it("an empty category can be deleted", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const created = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Временная категория" } });
    const res = await request(app)
      .delete(`/api/admin/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it("updating a product writes an audit log entry with actor/action/entity", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const created = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Аудит-тест" }, categoryId: COFFEE_CATEGORY_ID, price: 1000 });

    await request(app)
      .patch(`/api/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 1200 });

    // Audit reads aren't exposed over HTTP yet — verified directly via
    // the superuser pool as a stand-in for an eventual /admin/audit-log
    // endpoint. See docs/ARCHITECTURE.md "Known limitations".
    const rows = await superuserPool.query(
      "select action, actor_staff_id, target_type, target_id from audit_logs where target_id = $1 order by created_at",
      [created.body.id],
    );
    expect(rows.rows.map((r: { action: string }) => r.action)).toEqual([
      "catalog.product.created",
      "catalog.product.updated",
    ]);
    expect(rows.rows[0].target_type).toBe("product");
  });

  it("loyalty program updates are also audit-logged", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    await request(app)
      .patch("/api/admin/loyalty/program")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ birthdayBonusPoints: 1234 });

    const rows = await superuserPool.query(
      "select action from audit_logs where action = 'settings.loyalty_program.updated' order by created_at desc limit 1",
    );
    expect(rows.rowCount).toBe(1);
  });
});

describe("Reward price snapshot semantics", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("changing an active reward's cost does not change an already-pending redemption's price", async () => {
    const customerToken = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const staffToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);

    const account0 = await request(app).get("/api/me/loyalty/account").set("Authorization", `Bearer ${customerToken}`);
    expect(account0.body.pointsBalance).toBe(3288);

    const redeemed = await request(app)
      .post(`/api/me/rewards/${CAPPUCCINO_REWARD_ID}/redeem`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(redeemed.body.redemption.pointsCost).toBe(1000);
    const redemptionId = redeemed.body.redemption.id;

    const priceChange = await request(app)
      .patch(`/api/admin/rewards/${CAPPUCCINO_REWARD_ID}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ pointsCost: 1500 });
    expect(priceChange.body.pointsCost).toBe(1500);

    const confirmed = await request(app)
      .post(`/api/staff/redemptions/${redemptionId}/confirm`)
      .set("Authorization", `Bearer ${staffToken}`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.transaction.points).toBe(-1000);
    expect(confirmed.body.newBalance).toBe(3288 - 1000);

    const freshRedeem = await request(app)
      .post(`/api/me/rewards/${CAPPUCCINO_REWARD_ID}/redeem`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(freshRedeem.body.redemption.pointsCost).toBe(1500);
  });
});
