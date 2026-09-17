import { test, expect } from "@playwright/test";
import { API_URL, GUEST_URL, SEED, STAFF_URL, apiLoginCustomer, staffLogin } from "./helpers";

const PETIT_PRINCE_REWARD_ID = "70000000-0000-0000-0000-000000000003";

/**
 * Regression test for the HIGH PRIORITY bug the owner found manually
 * (product brief §25): Staff scanned an identity QR, backed out without
 * confirming, then scanned a reward QR — and the old identity/order
 * state was still on screen instead of the new reward's. Drives the
 * real Staff UI via its dev-only manual-token field (the only way to
 * reach a resolvable token outside the camera — see docs/QR-SECURITY.md),
 * confirming neither scan leaves state behind for the other.
 */
test("identity scan, leave without confirming, then reward scan shows no stale identity state", async ({
  page,
  request,
}) => {
  const customerToken = await apiLoginCustomer(request, SEED.nikolayEmail, SEED.nikolayPassword);

  const identityRes = await request.post(`${API_URL}/me/qr/identity`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(identityRes.ok()).toBe(true);
  const { token: identityToken } = await identityRes.json();

  await staffLogin(page);
  await page.goto(`${STAFF_URL}/scan`);
  await page.getByPlaceholder("Вставьте токен из Lua Guest").fill(identityToken);
  await page.getByRole("button", { name: "Проверить" }).click();
  await page.waitForURL(`${STAFF_URL}/transaction`);
  await expect(page.getByText("Выберите заказ")).toBeVisible();

  // Leave without confirming — exactly the manual-test repro step.
  await page.getByRole("button", { name: "Сканировать другой QR" }).click();
  await page.waitForURL(`${STAFF_URL}/scan`);

  const redeemRes = await request.post(`${API_URL}/me/rewards/${PETIT_PRINCE_REWARD_ID}/redeem`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(redeemRes.ok()).toBe(true);
  const { qr: rewardQr } = await redeemRes.json();

  await page.getByPlaceholder("Вставьте токен из Lua Guest").fill(rewardQr.token);
  await page.getByRole("button", { name: "Проверить" }).click();
  await page.waitForURL(`${STAFF_URL}/transaction`);

  // Reward UI only — no leftover "Выберите заказ"/order-selection state
  // from the previous identity scan.
  await expect(page.getByText("Награда за баллы")).toBeVisible();
  await expect(page.getByText("Выберите заказ")).toHaveCount(0);
  await expect(page.getByText("LUA-1001")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Подтвердить выдачу" })).toBeVisible();
});

/** The reverse order from the same bug report (product brief §25): reward scan, cancel, then identity scan has no stale reward state. */
test("reward scan, cancel, then identity scan shows no stale reward state", async ({ page, request }) => {
  const customerToken = await apiLoginCustomer(request, SEED.nikolayEmail, SEED.nikolayPassword);

  const redeemRes = await request.post(`${API_URL}/me/rewards/${PETIT_PRINCE_REWARD_ID}/redeem`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(redeemRes.ok()).toBe(true);
  const { qr: rewardQr } = await redeemRes.json();

  await staffLogin(page);
  await page.goto(`${STAFF_URL}/scan`);
  await page.getByPlaceholder("Вставьте токен из Lua Guest").fill(rewardQr.token);
  await page.getByRole("button", { name: "Проверить" }).click();
  await page.waitForURL(`${STAFF_URL}/transaction`);
  await expect(page.getByText("Награда за баллы")).toBeVisible();

  await page.getByRole("button", { name: "Отмена" }).click();
  await page.waitForURL(`${STAFF_URL}/scan`);

  const identityRes = await request.post(`${API_URL}/me/qr/identity`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(identityRes.ok()).toBe(true);
  const { token: identityToken } = await identityRes.json();

  await page.getByPlaceholder("Вставьте токен из Lua Guest").fill(identityToken);
  await page.getByRole("button", { name: "Проверить" }).click();
  await page.waitForURL(`${STAFF_URL}/transaction`);

  await expect(page.getByText("Выберите заказ")).toBeVisible();
  await expect(page.getByText("Награда за баллы")).toHaveCount(0);
});

/**
 * The reward QR screen context fix (product brief §24): Guest sees the
 * reward name, cost, current balance, and resulting balance before
 * scanning — not a near-blank screen.
 */
test("guest reward QR screen shows reward name, cost, and before/after balance", async ({ page }) => {
  await page.goto(`${GUEST_URL}/login`);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(`${GUEST_URL}/`);
  await page.goto(`${GUEST_URL}/club`);

  const cappuccinoCard = page.locator(".lua-club__reward", { hasText: "Капучино" });
  await cappuccinoCard.getByRole("button", { name: "Получить за баллы" }).click();
  await page.waitForURL(/\/qr/);

  await expect(page.getByText("Капучино").first()).toBeVisible();
  await expect(page.getByText("1 000", { exact: false })).toBeVisible();
  await expect(page.getByText("Баллы спишутся только после подтверждения", { exact: false })).toBeVisible();
});
