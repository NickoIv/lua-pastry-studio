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
