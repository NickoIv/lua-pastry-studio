import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { deleteUploadedImage, UPLOAD_ROOT } from "../src/media";
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

/**
 * Real, sharp-decodable tiny fixtures — every upload now goes through
 * optimizeImage() (packages/server/src/media.ts), which actually
 * decodes the buffer, so a fixture only needs to *sniff* as JPEG/WEBP
 * (packages/server/src/media.ts#sniffImageType checks magic numbers
 * only) is no longer enough; it must also be a real, valid image.
 */
function jpegBuffer(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 50, b: 50 } } })
    .jpeg()
    .toBuffer();
}
function webpBuffer(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 50, g: 50, b: 200 } } })
    .webp()
    .toBuffer();
}

describe("Admin media upload", () => {
  beforeAll(() => {
    resetDatabase();
  });

  it("ADMIN can upload a valid PNG — it's optimized to WebP and servable", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", pngBuffer(), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    // Every upload is normalized to WebP regardless of input format —
    // see packages/server/src/media.ts#optimizeImage.
    expect(res.body.mimeType).toBe("image/webp");
    expect(res.body.originalMimeType).toBe("image/png");
    expect(res.body.url).toMatch(/^\/media\/product\/.+\.webp$/);

    const served = await request(app).get(res.body.url);
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toContain("image/webp");
  });

  it("ADMIN can upload a valid JPEG and WEBP too — both optimized the same way", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const jpegRes = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", await jpegBuffer(), { filename: "test.jpg", contentType: "image/jpeg" });
    expect(jpegRes.status).toBe(201);
    expect(jpegRes.body.mimeType).toBe("image/webp");
    expect(jpegRes.body.originalMimeType).toBe("image/jpeg");

    const webpRes = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "collection")
      .attach("file", await webpBuffer(), { filename: "test.webp", contentType: "image/webp" });
    expect(webpRes.status).toBe(201);
    expect(webpRes.body.mimeType).toBe("image/webp");
    expect(webpRes.body.originalMimeType).toBe("image/webp");
    expect(webpRes.body.url).toMatch(/^\/media\/collection\//);
  });

  it("a large photo is resized so its longest edge never exceeds the web maximum", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const huge = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 10, g: 10, b: 10 } } })
      .jpeg()
      .toBuffer();
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("kind", "product")
      .attach("file", huge, { filename: "huge.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(201);
    expect(res.body.width).toBeLessThanOrEqual(1800);
    expect(res.body.height).toBeLessThanOrEqual(1800);
    expect(res.body.originalSizeBytes).toBeGreaterThan(0);
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
    expect(res.body.url).toMatch(/^\/media\/product\/[0-9a-f-]+\.webp$/);
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

describe("deleteUploadedImage — path safety", () => {
  it("refuses to unlink a path that normalizes outside the upload root", async () => {
    // A relativePath only ever comes from what this module itself
    // generated and stored (see packages/server/src/media.ts), but this
    // proves the defense-in-depth check holds even if a row were ever
    // corrupted or hand-edited to contain a traversal sequence. Uses the
    // OS temp dir (not a path under the repo) so a failed check can't
    // leave stray files behind for git to notice.
    const outsideDir = path.join(os.tmpdir(), "lua-media-safety-test");
    mkdirSync(outsideDir, { recursive: true });
    const canary = path.join(outsideDir, "canary.png");
    writeFileSync(canary, "not a real image");

    try {
      const traversal = path.relative(UPLOAD_ROOT, canary);
      await deleteUploadedImage(traversal);
      expect(existsSync(canary)).toBe(true);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });
});

const COFFEE_CATEGORY_ID = "20000000-0000-0000-0000-000000000001";

describe("Media asset FK — products/collections reference media_asset_id", () => {
  beforeAll(() => {
    resetDatabase();
  });

  async function uploadAsset(token: string, kind: "product" | "collection") {
    const res = await request(app)
      .post("/api/admin/media")
      .set("Authorization", `Bearer ${token}`)
      .field("kind", kind)
      .attach("file", pngBuffer(), { filename: "test.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    return res.body as { id: string; url: string };
  }

  it("creating a product with an uploaded image's URL links it to that media asset", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "product");

    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: { ru: "Миндальный круассан" },
        categoryId: COFFEE_CATEGORY_ID,
        price: 1500,
        imageUrl: asset.url,
      });
    expect(res.status).toBe(201);
    expect(res.body.mediaAssetId).toBe(asset.id);
    expect(res.body.imageUrl).toBe(asset.url);
  });

  it("a hand-pasted external image URL never links to a media asset", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const res = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: { ru: "Внешнее фото" },
        categoryId: COFFEE_CATEGORY_ID,
        price: 1000,
        imageUrl: "https://example.com/photo.jpg",
      });
    expect(res.status).toBe(201);
    expect(res.body.mediaAssetId).toBeUndefined();
    expect(res.body.imageUrl).toBe("https://example.com/photo.jpg");
  });

  it("updating a product's imageUrl to an uploaded asset's URL re-links the FK, and clearing it un-links", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "product");
    const created = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Тест FK" }, categoryId: COFFEE_CATEGORY_ID, price: 1000 });
    expect(created.body.mediaAssetId).toBeUndefined();

    const linked = await request(app)
      .patch(`/api/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ imageUrl: asset.url });
    expect(linked.body.mediaAssetId).toBe(asset.id);

    const unlinked = await request(app)
      .patch(`/api/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ imageUrl: null });
    expect(unlinked.body.mediaAssetId).toBeUndefined();
    expect(unlinked.body.imageUrl).toBeUndefined();
  });

  it("a collection referencing an uploaded image links to that media asset", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "collection");
    const res = await request(app)
      .post("/api/admin/collections")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Книжная коллекция" }, imageUrl: asset.url });
    expect(res.status).toBe(201);
    expect(res.body.mediaAssetId).toBe(asset.id);
  });

  it("a media asset still referenced by a product cannot be deleted, and names it in the message", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "product");
    await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Миндальный круассан" }, categoryId: COFFEE_CATEGORY_ID, price: 1500, imageUrl: asset.url });

    const del = await request(app).delete(`/api/admin/media/${asset.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe("MEDIA_ASSET_IN_USE");
    expect(del.body.error.message).toContain("Миндальный круассан");

    const served = await request(app).get(asset.url);
    expect(served.status).toBe(200);
  });

  it("a media asset still referenced by a collection cannot be deleted", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "collection");
    await request(app)
      .post("/api/admin/collections")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Летняя коллекция" }, imageUrl: asset.url });

    const del = await request(app).delete(`/api/admin/media/${asset.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe("MEDIA_ASSET_IN_USE");
    expect(del.body.error.message).toContain("Летняя коллекция");
  });

  it("an unused media asset deletes safely, removing both the row and the file", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "product");

    const beforeDelete = await request(app).get(asset.url);
    expect(beforeDelete.status).toBe(200);

    const del = await request(app).delete(`/api/admin/media/${asset.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(204);

    const afterDelete = await request(app).get(asset.url);
    expect(afterDelete.status).toBe(404);
  });

  it("deleting an unknown media asset id returns MEDIA_ASSET_NOT_FOUND", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const del = await request(app)
      .delete("/api/admin/media/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(404);
    expect(del.body.error.code).toBe("MEDIA_ASSET_NOT_FOUND");
  });

  it("after unlinking a product's image, the previously-attached asset can be deleted", async () => {
    const adminToken = await loginStaff(SEED.adminEmail, SEED.adminPassword);
    const asset = await uploadAsset(adminToken, "product");
    const created = await request(app)
      .post("/api/admin/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: { ru: "Временный товар" }, categoryId: COFFEE_CATEGORY_ID, price: 1000, imageUrl: asset.url });
    expect(created.body.mediaAssetId).toBe(asset.id);

    await request(app)
      .patch(`/api/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ imageUrl: null });

    const del = await request(app).delete(`/api/admin/media/${asset.id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(204);
  });
});
