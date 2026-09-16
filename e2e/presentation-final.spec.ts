import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { API_URL, ADMIN_URL, GUEST_URL, STAFF_URL, SEED, adminLogin, apiLoginCustomer, guestLogin, staffLogin } from "./helpers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(dirname, "..", "artifacts", "presentation-final");
const GUEST_VIEWPORT = { width: 390, height: 844 };
const ADMIN_VIEWPORT = { width: 1440, height: 900 };
const NIKOLAY_ID = "60000000-0000-0000-0000-000000000001";
const PETIT_PRINCE_REWARD_ID = "70000000-0000-0000-0000-000000000003";

/**
 * The finished presentation deliverable for the media-model/polish
 * checkpoint (docs/ARCHITECTURE.md "Media foundation", "§5-6 of the
 * session brief) — 12 screens, real backend, deterministic seeded data,
 * no dev overlays or skeletons. Run in isolation right after
 * `pnpm db:reset` (see package.json's `e2e:presentation` script), not
 * interleaved with the other e2e specs, since the Staff screenshots
 * issue one real reward-redemption QR session against the seeded
 * Nikolay account and deliberately never confirm it — see the "Staff"
 * describe block below.
 */
test.describe("presentation-final screenshots", () => {
  test("guest, staff, and admin screens render cleanly and are captured", async ({ browser, request }) => {
    const consoleErrors: string[] = [];

    // ---- Guest ---------------------------------------------------------
    const guestContext = await browser.newContext({ viewport: GUEST_VIEWPORT });
    const guestPage = await guestContext.newPage();
    guestPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[guest] ${msg.text()}`);
    });
    await guestLogin(guestPage);

    await shoot(guestPage, "01-home.png", () => guestPage.getByText("Lua Pastry Studio").first());

    await guestPage.goto(`${GUEST_URL}/menu`);
    await shoot(guestPage, "02-menu.png", () => guestPage.locator(".lua-product-card").first());

    await guestPage.goto(`${GUEST_URL}/club`);
    await shoot(guestPage, "03-club.png", () => guestPage.locator(".lua-club__balance"));

    await guestPage.goto(`${GUEST_URL}/qr`);
    await shoot(guestPage, "04-qr.png", () => guestPage.locator(".lua-qr-screen__code svg, .lua-qr-screen__code img"));

    await guestPage.goto(`${GUEST_URL}/orders`);
    await shoot(guestPage, "05-orders.png", () => guestPage.locator(".lua-orders__row").first());

    await guestPage.locator(".lua-orders__row").first().click();
    await guestPage.waitForURL(/\/orders\/.+/);
    await shoot(guestPage, "06-order-detail.png", () => guestPage.locator(".lua-order-detail__items"));

    await guestContext.close();

    // ---- Staff -----------------------------------------------------------
    // Both scenarios use direct API calls to reach a real, resolvable QR
    // token (there's no other way to get one — a token can't exist
    // without a real PENDING redemption / identity session row, by
    // design, see docs/QR-SECURITY.md), then the Staff app's own
    // dev-only manual-token field (apps/staff/src/routes/ScanScreen.tsx)
    // to resolve it exactly as a real device would. Neither screenshot
    // clicks the final "Confirm" button, so no ledger write happens —
    // capturing the deliverable doesn't mutate loyalty state.
    const customerToken = await apiLoginCustomer(request, SEED.nikolayEmail, SEED.nikolayPassword);

    const staffContext = await browser.newContext({ viewport: GUEST_VIEWPORT });
    const staffPage = await staffContext.newPage();
    staffPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[staff] ${msg.text()}`);
    });
    await staffLogin(staffPage);

    const redeemRes = await request.post(`${API_URL}/me/rewards/${PETIT_PRINCE_REWARD_ID}/redeem`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(redeemRes.ok()).toBe(true);
    const { qr: rewardQr } = await redeemRes.json();

    await staffPage.goto(`${STAFF_URL}/scan`);
    await staffPage.getByPlaceholder("Вставьте токен из Lua Guest").fill(rewardQr.token);
    await staffPage.getByRole("button", { name: "Проверить" }).click();
    await staffPage.waitForURL(`${STAFF_URL}/transaction`);
    await shoot(staffPage, "07-staff-reward-confirm.png", () =>
      staffPage.getByRole("button", { name: "Подтвердить выдачу" }),
    );

    const identityRes = await request.post(`${API_URL}/me/qr/identity`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(identityRes.ok()).toBe(true);
    const { token: identityToken } = await identityRes.json();

    await staffPage.goto(`${STAFF_URL}/scan`);
    await staffPage.getByPlaceholder("Вставьте токен из Lua Guest").fill(identityToken);
    await staffPage.getByRole("button", { name: "Проверить" }).click();
    await staffPage.waitForURL(`${STAFF_URL}/transaction`);
    await staffPage.locator(".lua-transaction__order-row", { hasText: "LUA-1001" }).click();
    await shoot(staffPage, "08-staff-order-earn.png", () =>
      staffPage.getByRole("button", { name: "Подтвердить покупку" }),
    );

    await staffContext.close();

    // ---- Admin -----------------------------------------------------------
    const adminContext = await browser.newContext({ viewport: ADMIN_VIEWPORT });
    const adminPage = await adminContext.newPage();
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[admin] ${msg.text()}`);
    });
    await adminLogin(adminPage);

    await shoot(adminPage, "09-admin-dashboard.png", () =>
      adminPage.getByText("Выручка (завершённые заказы)"),
    );

    await adminPage.goto(`${ADMIN_URL}/menu`);
    await adminPage.locator("tr", { hasText: "Эспрессо" }).getByRole("button", { name: "Изменить" }).click();
    await shoot(adminPage, "10-admin-product-editor.png", () => adminPage.getByText("Редактировать товар"));

    await adminPage.goto(`${ADMIN_URL}/customers/${NIKOLAY_ID}`);
    await shoot(adminPage, "11-admin-customer-detail.png", () => adminPage.getByRole("heading", { name: "Лояльность" }));

    await adminPage.goto(`${ADMIN_URL}/audit`);
    await shoot(adminPage, "12-admin-audit.png", () => adminPage.getByText("Журнал действий"));

    await adminContext.close();

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });
});

async function shoot(page: Page, filename: string, ready: () => ReturnType<Page["locator"]>) {
  await page.waitForLoadState("networkidle");
  await ready().waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, filename) });
}
