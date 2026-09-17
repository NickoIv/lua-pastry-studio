import { test, expect } from "@playwright/test";
import { ADMIN_URL, GUEST_URL, adminLogin, guestLogin } from "./helpers";

/**
 * The core Admin-CMS acceptance criterion: a product Admin creates
 * really persists to Postgres and is immediately visible to Guest: and
 * once archived, disappears from Guest without ever touching the
 * historical order rows that reference it (covered separately by
 * packages/server/tests/adminCatalog.test.ts at the API layer — this
 * proves the same thing through both real UIs).
 */
test("admin creates a product, Guest sees it, admin archives it, Guest stops seeing it", async ({ browser }) => {
  const productName = `E2E Десерт ${Date.now()}`;

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminLogin(adminPage);
  await adminPage.goto(`${ADMIN_URL}/menu`);

  await adminPage.getByRole("button", { name: "Товар" }).click();
  await adminPage.locator("#prod-name").fill(productName);
  await adminPage.locator("#prod-price").fill("900");
  await adminPage.getByRole("button", { name: "Сохранить" }).click();
  await expect(adminPage.locator("tr", { hasText: productName })).toBeVisible();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestLogin(guestPage);
  await guestPage.goto(`${GUEST_URL}/menu`);
  await guestPage.getByLabel("Найти напиток или десерт").fill(productName);
  await expect(guestPage.locator(".lua-product-card__name", { hasText: productName })).toBeVisible();

  const adminRow = adminPage.locator("tr", { hasText: productName });
  await adminRow.getByRole("button", { name: "Архивировать" }).click();
  await expect(adminRow.getByText("В архиве")).toBeVisible();

  await guestPage.reload();
  await guestPage.getByLabel("Найти напиток или десерт").fill(productName);
  await expect(guestPage.locator(".lua-product-card__name", { hasText: productName })).toHaveCount(0);

  await adminContext.close();
  await guestContext.close();
});
