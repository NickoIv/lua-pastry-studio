import type { APIRequestContext, Page } from "@playwright/test";

export const GUEST_URL = "http://localhost:5173";
export const STAFF_URL = "http://localhost:5174";
export const ADMIN_URL = "http://localhost:5175";
export const API_URL = "http://localhost:4000/api";

export const SEED = {
  nikolayEmail: "nikolay@lua.dev",
  nikolayPassword: "LuaGuest123!",
  adminEmail: "dana@lua.dev",
  adminPassword: "LuaStaff123!",
  baristaEmail: "aigerim@lua.dev",
  baristaPassword: "LuaStaff123!",
};

export async function guestLogin(page: Page) {
  await page.goto(`${GUEST_URL}/login`);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(`${GUEST_URL}/`);
}

export async function adminLogin(page: Page) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(`${ADMIN_URL}/`);
}

/** Direct API login — used where the flow under test isn't the login form itself. */
export async function apiLoginStaff(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API_URL}/auth/staff/login`, { data: { email, password } });
  const body = await res.json();
  return body.token as string;
}

export async function apiLoginCustomer(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API_URL}/auth/customer/login`, { data: { email, password } });
  const body = await res.json();
  return body.token as string;
}

/** Parses a rendered Points/Money string like "2 288" or "2288 ₸" into a plain number. */
export function parseDigits(text: string): number {
  return Number(text.replace(/[^\d-]/g, ""));
}
