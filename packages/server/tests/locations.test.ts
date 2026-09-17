import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, SEED } from "./helpers";

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}

describe("Locations — real Admin data (not hardcoded)", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("anyone signed in sees both seeded locations with short names, ordered by sortOrder", async () => {
    const token = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app).get("/api/locations").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.map((l: { shortName: string }) => l.shortName)).toEqual(["Достык", "Кок-Тобе"]);
  });

  it("ADMIN creates a new location and it propagates everywhere /locations is read", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/locations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Lua Pastry Studio — Есентай",
        shortName: "Есентай",
        address: "пр. Аль-Фараби, 77",
        city: "Алматы",
        openHours: "08:00–23:00",
        sortOrder: 3,
      });
    expect(res.status).toBe(201);
    expect(res.body.shortName).toBe("Есентай");

    const list = await request(app).get("/api/locations").set("Authorization", `Bearer ${adminToken}`);
    expect(list.body.map((l: { shortName: string }) => l.shortName)).toContain("Есентай");
  });

  it("ADMIN renames a location's short name, and it's reflected on the next read (no referential-integrity loss)", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch(`/api/admin/locations/${SEED.coffeeLocationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ shortName: "Достык Плаза" });
    expect(res.status).toBe(200);
    expect(res.body.shortName).toBe("Достык Плаза");
    expect(res.body.id).toBe(SEED.coffeeLocationId);

    // Historical orders at this location keep their FK intact.
    const orders = await request(app)
      .get("/api/admin/orders")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(orders.status).toBe(200);
    expect(orders.body.some((o: { locationId: string }) => o.locationId === SEED.coffeeLocationId)).toBe(true);
  });

  it("renaming an unknown location returns LOCATION_NOT_FOUND", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .patch("/api/admin/locations/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ shortName: "Ghost" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("LOCATION_NOT_FOUND");
  });

  it("BARISTA cannot create or edit locations", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const createRes = await request(app)
      .post("/api/admin/locations")
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ name: "x", shortName: "x", address: "x", city: "x", openHours: "x" });
    expect(createRes.status).toBe(403);

    const patchRes = await request(app)
      .patch(`/api/admin/locations/${SEED.coffeeLocationId}`)
      .set("Authorization", `Bearer ${baristaToken}`)
      .send({ shortName: "x" });
    expect(patchRes.status).toBe(403);
  });
});
