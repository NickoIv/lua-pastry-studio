import { test, expect } from "@playwright/test";
import { ADMIN_URL, adminLogin } from "./helpers";

/**
 * Admin creates a real staff account with the simplified staff-code +
 * PIN flow (product brief §6 — no individual work email required),
 * assigns it to both locations, changes its role, then deactivates it —
 * all through the real UI against the real backend. A separate
 * assertion (adminStaff.test.ts, at the API layer) proves OWNER can't
 * be touched this way at all; this spec proves the ordinary staff
 * lifecycle, including multi-location assignment, actually works end
 * to end.
 */
test("admin creates a staff account with PIN + code, assigns both locations, changes its role, and deactivates it", async ({
  page,
}) => {
  await adminLogin(page);
  await page.goto(`${ADMIN_URL}/staff`);

  const staffCode = `E2E${Date.now() % 100000}`;
  const displayName = `E2E Сотрудник ${Date.now() % 100000}`;

  await page.getByRole("button", { name: "Добавить сотрудника" }).click();
  await page.locator("#staff-name").fill(displayName);
  await page.locator("#staff-role").selectOption("BARISTA");
  // Both seeded locations — checkbox labels are the locations' short names.
  await page.getByRole("checkbox", { name: "Достык" }).check();
  await page.getByRole("checkbox", { name: "Кок-Тобе" }).check();
  await page.locator("#staff-code").fill(staffCode);
  await page.locator("#staff-pin").fill("4826");
  await page.getByRole("button", { name: "Сохранить" }).click();

  const row = page.locator("tr", { hasText: displayName });
  await expect(row).toBeVisible();
  await expect(row.getByText("Бариста")).toBeVisible();
  await expect(row.getByText("Достык, Кок-Тобе")).toBeVisible();

  await row.getByRole("button", { name: "Изменить" }).click();
  await page.locator("#staff-role").selectOption("SHIFT_MANAGER");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(row.getByText("Старший смены")).toBeVisible();

  await row.getByRole("button", { name: "Деактивировать" }).click();
  await expect(row.getByText("Неактивен")).toBeVisible();
});
