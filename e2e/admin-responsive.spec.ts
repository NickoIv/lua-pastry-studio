import { test, expect } from "@playwright/test";
import { ADMIN_URL, adminLogin } from "./helpers";

const WIDTHS = [900, 1024, 1100, 1280, 1440];
const SCREENS = ["/staff", "/customers", "/menu", "/orders", "/audit"];

test("admin screens have no page-level horizontal overflow at any required width", async ({ page }) => {
  await adminLogin(page);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of SCREENS) {
      await page.goto(`${ADMIN_URL}${path}`);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px overflowed by ${overflow}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("staff table action buttons remain reachable (not clipped) at 1024px", async ({ page }) => {
  await adminLogin(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${ADMIN_URL}/staff`);
  const firstRow = page.locator(".lua-data-table tbody tr").first();
  await expect(firstRow).toBeVisible();
  // Either the inline button or the "…" menu must be within the viewport.
  const box = await firstRow.locator(".lua-table-row-actions").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(1024);
});

test("Admin remains usable for editing on an iPhone-sized screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminLogin(page);
  await page.goto(`${ADMIN_URL}/menu`);
  await page.waitForLoadState("networkidle");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "the Admin page itself must not scroll sideways on an iPhone").toBeLessThanOrEqual(1);

  const navItem = page.locator(".lua-admin-shell__nav-item").first();
  const navBox = await navItem.boundingBox();
  expect(navBox).not.toBeNull();
  expect(navBox!.height, "mobile navigation must retain a touch-friendly target").toBeGreaterThanOrEqual(44);

  const addProduct = page.getByRole("button", { name: "Товар", exact: true });
  await expect(addProduct).toBeVisible();
  await addProduct.click();
  await expect(page.locator(".lua-modal")).toBeVisible();
  const modalOverflow = await page.locator(".lua-modal").evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(modalOverflow, "product editor must fit the phone viewport").toBeLessThanOrEqual(1);
});
