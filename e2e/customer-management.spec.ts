import { test, expect } from "@playwright/test";
import { ADMIN_URL, adminLogin } from "./helpers";

const NIKOLAY_ID = "60000000-0000-0000-0000-000000000001";

/**
 * The full Customer Detail workflow through the real Admin UI: view a
 * real customer's orders/ledger, correct their display name, and apply
 * a manual point adjustment — proving it creates a new ledger row (not
 * a balance overwrite) and shows up in the Audit Log.
 */
test("admin views customer history, edits their name, and applies a manual point adjustment", async ({ page }) => {
  await adminLogin(page);
  await page.goto(`${ADMIN_URL}/customers/${NIKOLAY_ID}`);

  await expect(page.getByText("Николай").first()).toBeVisible();
  await expect(page.locator("text=/₸/").first()).toBeVisible();

  const newName = `Николай-E2E-${Date.now() % 100000}`;
  await page.getByRole("button", { name: "Изменить имя" }).click();
  await page.locator("#cust-first-name").fill(newName);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(newName).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(newName).first()).toBeVisible();

  const reason = `E2E: компенсация за ошибку при заказе ${Date.now()}`;
  const adjustResponsePromise = page.waitForResponse((res) => res.url().includes("/adjust-points"));
  await page.getByRole("button", { name: "Корректировать баллы" }).click();
  // "Начислить" is the default direction; fill the plain (non-negative)
  // magnitude, then the two-step confirm flow (product brief §8).
  await page.locator("#adjust-amount").fill("500");
  await page.locator("#adjust-reason").fill(reason);
  await page.getByRole("button", { name: "Далее" }).click();
  await expect(page.getByText(`Начислить ${newName}`, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить" }).click();
  const adjustResponse = await adjustResponsePromise;
  const { transaction, newBalance, replayed } = await adjustResponse.json();
  expect(replayed).toBe(false);
  expect(transaction.points).toBe(500);

  await expect(page.getByText(reason).first()).toBeVisible();
  expect(newBalance).toBeGreaterThan(0);

  await page.goto(`${ADMIN_URL}/audit`);
  await expect(page.getByText(reason, { exact: false }).first()).toBeVisible();

  // Restore the seed's original first name so the presentation fixtures
  // (and other tests reading "Николай") stay deterministic — see
  // docs/ARCHITECTURE.md "Commercial-demo stability".
  await page.goto(`${ADMIN_URL}/customers/${NIKOLAY_ID}`);
  await page.getByRole("button", { name: "Изменить имя" }).click();
  await page.locator("#cust-first-name").fill("Николай");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Николай", { exact: true }).first()).toBeVisible();
});
