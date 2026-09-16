import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, superuserPool, SEED } from "./helpers";

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}

describe("Admin staff management", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("ADMIN creates a BARISTA account and it persists", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "e2e-new-barista@lua.dev",
        password: "TempPass123!",
        displayName: "Новый Бариста",
        role: "BARISTA",
        locationId: SEED.coffeeLocationId,
      });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("BARISTA");
    expect(res.body.active).toBe(true);
    // Never echoes the password back.
    expect(JSON.stringify(res.body)).not.toMatch(/TempPass123/);

    const login = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: "e2e-new-barista@lua.dev", password: "TempPass123!" });
    expect(login.status).toBe(200);

    const stored = await superuserPool.query("select password_hash from staff_profiles where id = $1", [
      res.body.id,
    ]);
    expect(stored.rows[0].password_hash).not.toBe("TempPass123!");
    expect(stored.rows[0].password_hash.startsWith("$2")).toBe(true); // bcrypt hash
  });

  it("ADMIN changes a BARISTA's role to SHIFT_MANAGER", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch(`/api/admin/staff/${SEED.baristaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "SHIFT_MANAGER" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("SHIFT_MANAGER");
  });

  it("ADMIN cannot create an OWNER account", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "sneaky-owner@lua.dev",
        password: "TempPass123!",
        displayName: "Sneaky",
        role: "OWNER",
        locationId: SEED.coffeeLocationId,
      });
    expect([403, 422]).toContain(res.status);

    const count = await superuserPool.query("select count(*) from staff_profiles where role = 'OWNER'");
    expect(Number(count.rows[0].count)).toBe(1);
  });

  it("the database function itself refuses to create an OWNER, independent of the API-layer check", async () => {
    // Proves the DB-level guard (015_staff_management.sql) works even if
    // an API-layer bug ever let an OWNER role value through to it — the
    // same session setup packages/server/src/db.ts#withRole uses, just
    // driven directly instead of through the HTTP layer.
    const client = await superuserPool.connect();
    try {
      await client.query("begin");
      await client.query("set local role app_admin");
      await client.query("select set_config('app.staff_id', $1, true)", [SEED.adminId]);
      await expect(
        client.query("select * from admin_create_staff_account($1, $2, $3, 'OWNER', $4)", [
          "sneaky2@lua.dev",
          "TempPass123!",
          "Sneaky",
          SEED.coffeeLocationId,
        ]),
      ).rejects.toThrow(/OWNER_PROTECTED/);
    } finally {
      await client.query("rollback").catch(() => undefined);
      client.release();
    }
  });

  it("ADMIN cannot modify the OWNER account", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch(`/api/admin/staff/${SEED.ownerId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("OWNER_PROTECTED");

    const still = await superuserPool.query("select active, role from staff_profiles where id = $1", [
      SEED.ownerId,
    ]);
    expect(still.rows[0].active).toBe(true);
    expect(still.rows[0].role).toBe("OWNER");
  });

  it("BARISTA cannot create, modify, or read staff accounts", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const createRes = await request(app)
      .post("/api/admin/staff")
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ email: "x@lua.dev", password: "TempPass123!", displayName: "X", role: "BARISTA", locationId: SEED.coffeeLocationId });
    expect(createRes.status).toBe(403);

    const patchRes = await request(app)
      .patch(`/api/admin/staff/${SEED.baristaId}`)
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ active: false });
    expect(patchRes.status).toBe(403);

    const listRes = await request(app).get("/api/admin/staff").set("Authorization", `Bearer ${baristaToken}`);
    expect(listRes.status).toBe(403);
  });

  it("deactivating and reactivating a staff account round-trips", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const off = await request(app)
      .patch(`/api/admin/staff/${SEED.baristaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: false });
    expect(off.body.active).toBe(false);

    const loginWhileOff = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: SEED.baristaEmail, password: SEED.baristaPassword });
    expect(loginWhileOff.status).toBe(401);

    const on = await request(app)
      .patch(`/api/admin/staff/${SEED.baristaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ active: true });
    expect(on.body.active).toBe(true);
  });
});
