import type { Id, ISODateTimeString } from "./common";

export type StaffUserId = Id<"StaffUser">;
export type LocationId = Id<"Location">;

export const ROLES = ["BARISTA", "WAITER", "SHIFT_MANAGER", "ADMIN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "qr.scan",
  "order.attach_customer",
  "loyalty.earn",
  "reward.redeem.confirm",
  "operation.void",
  "refund.issue",
  "shift.view_log",
  "customers.manage",
  "orders.manage",
  "loyalty.manage",
  "promotions.manage",
  "menu.manage",
  "rewards.manage",
  "staff.manage",
  "analytics.view",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  BARISTA: ["qr.scan", "order.attach_customer", "loyalty.earn", "reward.redeem.confirm"],
  WAITER: ["qr.scan", "order.attach_customer", "loyalty.earn", "reward.redeem.confirm"],
  SHIFT_MANAGER: [
    "qr.scan",
    "order.attach_customer",
    "loyalty.earn",
    "reward.redeem.confirm",
    "operation.void",
    "refund.issue",
    "shift.view_log",
  ],
  ADMIN: [
    "qr.scan",
    "order.attach_customer",
    "loyalty.earn",
    "reward.redeem.confirm",
    "operation.void",
    "refund.issue",
    "shift.view_log",
    "customers.manage",
    "orders.manage",
    "loyalty.manage",
    "promotions.manage",
    "menu.manage",
    "rewards.manage",
    "staff.manage",
    "analytics.view",
  ],
  OWNER: PERMISSIONS,
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export interface StaffUser {
  id: StaffUserId;
  displayName: string;
  role: Role;
  locationId: LocationId;
  pin?: string;
  active: boolean;
  createdAt: ISODateTimeString;
}
