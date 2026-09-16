import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_URL, GUEST_URL, adminLogin, guestLogin } from "./helpers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(dirname, "..", "artifacts", "presentation");
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/**
 * Not a functional test — this is the deliverable itself. Each screen
 * gets a real, backend-backed screenshot with no skeletons/dev overlays
 * visible, suitable for a pitch deck. A failed console-error assertion
 * here is a real regression signal too (a broken render often shows a
 * blank screen that still "looks fine" in a screenshot).
 */
test.describe("presentation screenshots", () => {
  test("guest + admin screens render cleanly and are captured", async ({ browser }) => {
    const consoleErrors: string[] = [];

    const guestContext = await browser.newContext({ viewport: MOBILE_VIEWPORT });
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

    const adminContext = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    const adminPage = await adminContext.newPage();
    adminPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[admin] ${msg.text()}`);
    });
    await adminLogin(adminPage);

    await adminPage.goto(`${ADMIN_URL}/menu`);
    await shoot(adminPage, "07-admin-menu.png", () => adminPage.locator(".lua-data-table").first());

    await adminPage.goto(`${ADMIN_URL}/`);
    await shoot(adminPage, "08-admin-dashboard.png", () =>
      adminPage.getByText("Выручка (завершённые заказы)"),
    );

    await adminContext.close();

    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });
});

async function shoot(page: Page, filename: string, ready: () => ReturnType<Page["locator"]>) {
  await page.waitForLoadState("networkidle");
  await ready().waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, filename) });
}
