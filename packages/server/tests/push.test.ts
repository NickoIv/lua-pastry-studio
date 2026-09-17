import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, SEED } from "./helpers";

async function loginCustomer(email: string, password: string) {
  const res = await request(app).post("/api/auth/customer/login").send({ email, password });
  return res.body.token as string;
}

describe("Push notifications — standards-based Web Push foundation", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("exposes a VAPID public key so the browser can call pushManager.subscribe()", async () => {
    const res = await request(app).get("/api/push/public-key");
    expect(res.status).toBe(200);
    expect(typeof res.body.publicKey).toBe("string");
    expect(res.body.publicKey!.length).toBeGreaterThan(0);
  });

  it("a customer can subscribe, fetch/update preferences, then unsubscribe", async () => {
    const token = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);

    const subscribe = await request(app)
      .post("/api/me/push-subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint: "https://fcm.example.com/abc123", keys: { p256dh: "p256dh-key", auth: "auth-key" } });
    expect(subscribe.status).toBe(201);

    // Subscribing creates a default preferences row.
    const prefs = await request(app).get("/api/me/notification-preferences").set("Authorization", `Bearer ${token}`);
    expect(prefs.status).toBe(200);
    expect(prefs.body).toEqual({ loyalty: true, rewards: true, promotions: false });

    const updated = await request(app)
      .patch("/api/me/notification-preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({ promotions: true, loyalty: false });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ loyalty: false, rewards: true, promotions: true });

    const unsubscribe = await request(app)
      .delete("/api/me/push-subscriptions")
      .query({ endpoint: "https://fcm.example.com/abc123" })
      .set("Authorization", `Bearer ${token}`);
    expect(unsubscribe.status).toBe(200);
  });

  it("re-subscribing the same endpoint updates it in place rather than duplicating", async () => {
    const token = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const endpoint = "https://fcm.example.com/dup-endpoint";
    const first = await request(app)
      .post("/api/me/push-subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint, keys: { p256dh: "key-1", auth: "auth-1" } });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post("/api/me/push-subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint, keys: { p256dh: "key-2", auth: "auth-2" } });
    expect(second.status).toBe(201);
  });

  it("subscribing without a p256dh/auth key is rejected", async () => {
    const token = await loginCustomer(SEED.nikolayEmail, SEED.nikolayPassword);
    const res = await request(app)
      .post("/api/me/push-subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint: "https://fcm.example.com/missing-keys" });
    expect(res.status).toBe(422);
  });

  it("staff cannot access guest push endpoints", async () => {
    const staffLogin = await request(app)
      .post("/api/auth/staff/login")
      .send({ email: SEED.adminEmail, password: SEED.adminPassword });
    const res = await request(app)
      .get("/api/me/notification-preferences")
      .set("Authorization", `Bearer ${staffLogin.body.token}`);
    expect(res.status).toBe(401);
  });

  it("an unauthenticated request cannot subscribe", async () => {
    const res = await request(app)
      .post("/api/me/push-subscriptions")
      .send({ endpoint: "https://fcm.example.com/anon", keys: { p256dh: "a", auth: "b" } });
    expect(res.status).toBe(401);
  });
});
