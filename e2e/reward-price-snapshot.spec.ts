import { test, expect } from "@playwright/test";
import { API_URL, GUEST_URL, SEED, apiLoginStaff, guestLogin, parseDigits } from "./helpers";

const CAPPUCCINO_REWARD_ID = "70000000-0000-0000-0000-000000000001";
const CAPPUCCINO_ORIGINAL_COST = 1000;
const CAPPUCCINO_CHANGED_COST = 1500;

/**
 * The critical loyalty invariant, driven through the real Guest UI for
 * the "request" half: once a reward redemption is PENDING, changing the
 * reward's price in Admin must not change what that redemption actually
 * costs when staff confirms it. Confirming is done via the API directly
 * rather than Staff's camera scanner — see docs/QR-SECURITY.md; this
 * repo deliberately doesn't redesign or drive the camera in tests.
 */
test("changing a reward's price after a redemption is requested does not change its cost at confirm", async ({
  page,
  request,
}) => {
  await guestLogin(page);
  await page.goto(`${GUEST_URL}/club`);

  const balanceBefore = parseDigits(await page.locator(".lua-club__balance").innerText());

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes(`/rewards/${CAPPUCCINO_REWARD_ID}/redeem`),
  );
  const cappuccinoCard = page.locator(".lua-club__reward", { hasText: "Капучино" });
  await cappuccinoCard.getByRole("button", { name: "Получить за баллы" }).click();
  const redeemResponse = await responsePromise;
  const { redemption, qr } = await redeemResponse.json();
  expect(redemption.pointsCost).toBe(CAPPUCCINO_ORIGINAL_COST);

  const adminToken = await apiLoginStaff(request, SEED.adminEmail, SEED.adminPassword);
  const patchRes = await request.patch(`${API_URL}/admin/rewards/${CAPPUCCINO_REWARD_ID}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { pointsCost: CAPPUCCINO_CHANGED_COST },
  });
  expect(patchRes.ok()).toBe(true);

  const staffToken = await apiLoginStaff(request, SEED.baristaEmail, SEED.baristaPassword);
  const resolveRes = await request.post(`${API_URL}/staff/qr/resolve`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { token: qr.token },
  });
  const scan = await resolveRes.json();
  expect(scan.redemption.pointsCost).toBe(CAPPUCCINO_ORIGINAL_COST);

  const confirmRes = await request.post(`${API_URL}/staff/redemptions/${redemption.id}/confirm`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const confirmed = await confirmRes.json();
  expect(confirmed.transaction.points).toBe(-CAPPUCCINO_ORIGINAL_COST);
  expect(confirmed.newBalance).toBe(balanceBefore - CAPPUCCINO_ORIGINAL_COST);

  // Restore the reward's price so this test is repeatable against a
  // long-lived dev database, and doesn't leak state into other tests.
  await request.patch(`${API_URL}/admin/rewards/${CAPPUCCINO_REWARD_ID}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { pointsCost: CAPPUCCINO_ORIGINAL_COST },
  });
});
