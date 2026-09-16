import { test, expect } from "@playwright/test";
import { ADMIN_URL, adminLogin } from "./helpers";

/**
 * Admin creates a real staff account, changes its role twice, then
 * deactivates it — all through the real UI against the real backend.
 * A separate assertion (adminStaff.test.ts, run at the API layer)
 * proves OWNER can't be touched this way at all; this spec proves the
 * ordinary staff lifecycle actually works end to end.
 */
test("admin creates a staff account, changes its role, and deactivates it", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ADMIN_URL}/staff`);

  const email = `e2e-staff-${Date.now()}@lua.dev`;
  const displayName = `E2E Сотрудник ${Date.now() % 100000}`;

  await page.getByRole("button", { name: "Добавить сотрудника" }).click();
  await page.locator("#staff-name").fill(displayName);
  await page.locator("#staff-email").fill(email);
  await page.locator("#staff-password").fill("TempPass123!");
  await page.locator("#staff-role").selectOption("BARISTA");
  await page.getByRole("button", { name: "Сохранить" }).click();

  const row = page.locator("tr", { hasText: displayName });
  await expect(row).toBeVisible();
  await expect(row.getByText("Бариста")).toBeVisible();

  await row.getByRole("button", { name: "Изменить" }).click();
  await page.locator("#staff-role").selectOption("SHIFT_MANAGER");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(row.getByText("Старший смены")).toBeVisible();

  await row.getByRole("button", { name: "Деактивировать" }).click();
  await expect(row.getByText("Неактивен")).toBeVisible();
});
