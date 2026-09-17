import { test, expect } from "@playwright/test";
import { GUEST_URL, guestLogin } from "./helpers";

/**
 * The product detail flow that was completely missing on iPhone
 * (product brief §12): tapping a Menu card now opens a real detail
 * screen with real backend data, and Back returns to the menu.
 */
test("guest taps a product card, sees real detail data, and goes back", async ({ page }) => {
  await guestLogin(page);
  await page.goto(`${GUEST_URL}/menu`);

  const card = page.locator(".lua-product-card", { hasText: "Капучино" }).first();
  await expect(card).toBeVisible();
  await card.click();

  await page.waitForURL(/\/menu\/product\/.+/);
  await expect(page.locator(".lua-product-detail__name")).toHaveText("Капучино");
  await expect(page.getByText("1 900", { exact: false })).toBeVisible();
  await expect(page.getByText("Молоко", { exact: false })).toBeVisible();

  await page.getByLabel("Назад").click();
  await page.waitForURL(`${GUEST_URL}/menu`);
});

/**
 * Guest location selection (product brief §19): previously a dead
 * "Адреса кофеен" row. Selecting a location now persists to the
 * customer's profile and is readable back from Profile.
 */
test("guest selects a coffee shop from Profile and it's remembered", async ({ page }) => {
  await guestLogin(page);
  await page.goto(`${GUEST_URL}/profile`);

  await page.getByText("Адреса кофеен").click();
  await page.waitForURL(/\/profile\/locations/);
  // Both rows' selected/unselected state depends on the profile fetch
  // resolving — wait for the list to fully settle before reading either
  // row's state, otherwise an `isVisible()` snapshot taken mid-fetch
  // can race and silently see neither the button nor the badge.
  await page.waitForLoadState("networkidle");

  // Real backend, real persisted state — start from a known baseline
  // (Достык selected) so this test is order-independent regardless of
  // what a previous run left selected.
  const dostykRow = page.locator(".lua-location-select__row", { hasText: "Достык" });
  const dostykSelectButton = dostykRow.getByRole("button", { name: "Выбрать" });
  if (await dostykSelectButton.isVisible()) {
    await dostykSelectButton.click();
    await expect(dostykRow.getByText("Выбрано")).toBeVisible();
  }

  const kokTobeRow = page.locator(".lua-location-select__row", { hasText: "Кок-Тобе" });
  await kokTobeRow.getByRole("button", { name: "Выбрать" }).click();
  await expect(kokTobeRow.getByText("Выбрано")).toBeVisible();

  await page.reload();
  await expect(page.locator(".lua-location-select__row", { hasText: "Кок-Тобе" }).getByText("Выбрано")).toBeVisible();

  // Leave the profile back at the seed's implicit baseline for other
  // tests/manual runs that assume Достык.
  await dostykRow.getByRole("button", { name: "Выбрать" }).click();
  await expect(dostykRow.getByText("Выбрано")).toBeVisible();
});
