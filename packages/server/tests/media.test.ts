import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, resetDatabase, SEED } from "./helpers";

async function loginStaff(email: string, password: string) {
  const res = await request(app).post("/api/auth/staff/login").send({ email, password });
  return res.body.token as string;
}

function pngBuffer(): Buffer {
  // A minimal valid 1x1 PNG (same structural shape packages/server/src/media.ts sniffs for).
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
}

describe("Admin media upload", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("ADMIN can upload a valid PNG and it's servable", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", pngBuffer(), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.mimeType).toBe("image/png");
    expect(res.body.url).toMatch(/^\/media\/product\/.+\.png$/);

    const served = await request(app).get(res.body.url);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toContain("image/png");
  });

  it("ADMIN can upload a valid JPEG and WEBP too", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 0)]);
    const jpegRes = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", jpeg, { filename: "test.jpg", contentType: "image/jpeg" });
    expect(jpegRes.status).toBe(201);
    expect(jpegRes.body.mimeType).toBe("image/jpeg");

    const webp = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBPVP8 ", "ascii"),
      Buffer.alloc(20, 0),
    ]);
    const webpRes = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "collection")
      .attach("file", webp, { filename: "test.webp", contentType: "image/webp" });
    expect(webpRes.status).toBe(201);
    expect(webpRes.body.mimeType).toBe("image/webp");
    expect(webpRes.body.url).toMatch(/^\/media\/collection\//);
  });

  it("BARISTA is forbidden from uploading media", async () => {
    const baristaToken = await loginStaff(SEED.baristaEmail, SEED.baristaPassword);
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${baristaToken}`)
      .field("kind", "product")
      .attach("file", pngBuffer(), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(403);
  });

  it("an oversized file is rejected", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const oversized = Buffer.alloc(9 * 1024 * 1024, 0); // over the 8 MB limit
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", oversized, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(422);
  });

  it("a file whose real bytes don't match any accepted format is rejected, even with a spoofed Content-Type/filename", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const notAnImage = Buffer.from("<script>alert(1)</script>", "utf8");
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", notAnImage, { filename: "innocuous.png", contentType: "image/png" });
    expect(res.status).toBe(422);
  });

  it("an uploaded file's path always stays inside the upload directory (server-generated filenames only)", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", pngBuffer(), { filename: "../../../etc/passwd.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    // The client's filename is never used to build the stored path —
    // the response URL is always a server-generated UUID under /media/<kind>/.
    expect(res.body.url).toMatch(/^\/media\/product\/[0-9a-f-]+\.png$/);
    expect(res.body.url).not.toContain("..");
    expect(res.body.url).not.toContain("etc/passwd");
  });

  it("an unsupported kind value is rejected", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "../../etc")
      .attach("file", pngBuffer(), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(422);
  });

  it("an unauthenticated upload is rejected", async () => {
    const res = await request(app)
      .post("/api/admin/media")
      .field("kind", "product")
      .attach("file", pngBuffer(), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(401);
  });
});
