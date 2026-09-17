import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, SEED } from "./helpers";

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}

describe("Admin audit log", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("ADMIN can read the audit log", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    // Produce at least one entry to read back.
    await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Аудит-категория" } });

    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty("action");
    expect(res.body.items[0]).toHaveProperty("summary");
    expect(res.body.items[0]).toHaveProperty("createdAt");
    // Never leaks secrets — see packages/server/src/audit.ts's doc comment.
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    expect(JSON.stringify(res.body)).not.toMatch(/token_digest|jwt/i);
  });

  it("BARISTA is forbidden from reading the audit log", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${baristaToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("SHIFT_MANAGER is forbidden from reading the audit log", async () => {
    const token = await loginStaff(SEED.shiftManagerEmail, SEED.shiftManagerPassword);
    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("an unauthenticated request is rejected", async () => {
    const res = await request(app).get("/api/admin/audit-log");
    expect(res.status).toBe(401);
  });

  it("filtering by action returns only matching entries", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Ещё одна аудит-категория" } });

    const res = await request(app)
      .get("/api/admin/audit-log?action=catalog.category.created")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const entry of res.body.items) {
      expect(entry.action).toBe("catalog.category.created");
    }
  });

  it("filtering by actor returns only that staff member's entries", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .get(`/api/admin/audit-log?actorStaffId=${SEED.adminId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    for (const entry of res.body.items) {
      expect(entry.actorStaffId).toBe(SEED.adminId);
    }
  });

  it("resolves a human-readable targetLabel instead of a raw UUID (product brief §10/§11)", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const created = await request(app)
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Категория с меткой" } });
    expect(created.status).toBe(201);

    const res = await request(app)
      .get("/api/admin/audit-log?action=catalog.category.created")
      .set("Authorization", `Bearer ${adminToken}`);
    const entry = res.body.items.find((e: { targetId: string }) => e.targetId === created.body.id);
    expect(entry).toBeDefined();
    expect(entry.targetLabel).toBe("Категория с меткой");
  });

  it("a manual loyalty adjustment's audit entry resolves the customer's name as its targetLabel and carries the reason in metadata", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    await request(app)
      .post(`/api/admin/customers/${SEED.nikolayId}/adjust-points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 10, reason: "Тестовая метка" });

    const res = await request(app)
      .get(`/api/admin/audit-log?action=loyalty.manual_adjustment&actorStaffId=${SEED.adminId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    const entry = res.body.items[0];
    expect(entry.targetLabel).toBe("Николай");
    // The Audit list row shows "Причина: …" inline (product brief §11),
    // which reads this metadata field directly instead of re-parsing it
    // out of the summary sentence.
    expect(entry.metadata.reason).toBe("Тестовая метка");
  });

  it("results are ordered newest first and paginated", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .get("/api/admin/audit-log?pageSize=1&page=1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.pageSize).toBe(1);

    const res2 = await request(app)
      .get("/api/admin/audit-log?pageSize=1&page=2")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res2.status).toBe(200);
    if (res2.body.items.length > 0) {
      expect(new Date(res.body.items[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(res2.body.items[0].createdAt).getTime(),
      );
    }
  });
});
