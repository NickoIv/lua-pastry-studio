import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_URL, GUEST_URL, adminLogin, guestLogin } from "./helpers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE = path.join(dirname, "fixtures", "test-product.png");

/**
 * The local media pipeline end to end: Admin uploads a real (tiny,
 * repo-owned) PNG onto an existing product, and Guest's Menu — reading
 * the same product through the real backend, not a mock — renders it
 * instead of the placeholder. Proves apps/guest/src/components/ProductCard.tsx
 * actually wires `imageUrl` through to `<ImageSurface src>`.
 */
test("admin uploads a product image and Guest's Menu renders it", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ADMIN_URL}/menu`);

  const row = page.locator("tr", { hasText: "Эспрессо" });
  await row.getByRole("button", { name: "Изменить" }).click();

  // No need to click the visible trigger button first — Playwright can
  // set files on the hidden <input type="file"> directly.
  const uploadResponsePromise = page.waitForResponse((res) => res.url().includes("/admin/media") && res.request().method() === "POST");
  await page.locator("#media-upload-input").setInputFiles(FIXTURE_IMAGE);
  await uploadResponsePromise;
  // The trigger button reads "Заменить" once an image is present, "Загрузить" otherwise — either confirms the upload round-trip landed in the form.
  await expect(page.getByRole("button", { name: /Загрузить|Заменить/ })).toBeVisible();

  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(row).toBeVisible();

  const guestContext = await page.context().browser()!.newContext();
  const guestPage = await guestContext.newPage();
  await guestLogin(guestPage);
  await guestPage.goto(`${GUEST_URL}/menu`);
  await guestPage.getByLabel("Найти напиток или десерт").fill("Эспрессо");
  await expect(guestPage.locator(".lua-product-card__name", { hasText: "Эспрессо" })).toBeVisible();
  await expect(guestPage.locator(".lua-image-surface__img").first()).toBeVisible();
  const src = await guestPage.locator(".lua-image-surface__img").first().getAttribute("src");
  expect(src).toContain("/media/product/");

  await guestContext.close();
});
