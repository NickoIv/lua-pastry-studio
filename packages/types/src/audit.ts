import type { Id, ISODateTimeString } from "./common";
import type { StaffUserId } from "./staff";

export type AuditLogId = Id<"AuditLog">;

export const AUDIT_ACTIONS = [
  "loyalty.earn",
  "loyalty.redeem",
  "loyalty.manual_adjustment",
  "loyalty.reversal",
  "order.void",
  "order.refund",
  "reward.redemption.created",
  "reward.redemption.fulfilled",
  "reward.redemption.cancelled",
  "staff.login",
  "staff.role_changed",
  "menu.item.updated",
  "settings.loyalty_program.updated",
  "catalog.category.created",
  "catalog.category.updated",
  "catalog.category.deleted",
  "catalog.product.created",
  "catalog.product.updated",
  "catalog.product.archived",
  "catalog.availability.updated",
  "catalog.collection.created",
  "catalog.collection.updated",
  "catalog.collection.deleted",
  "catalog.reward.created",
  "catalog.reward.updated",
  "catalog.reward.archived",
  "staff.created",
  "staff.updated",
  "staff.deactivated",
  "staff.reactivated",
  "customer.name_updated",
  "customer.birthday_updated",
  "media.uploaded",
  "media.removed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Append-only record of every privileged or reversible action. Nothing
 * that touches money or points should happen without one of these.
 */
export interface AuditLog {
  id: AuditLogId;
  action: AuditAction;
  actorStaffId?: StaffUserId;
  targetType: string;
  targetId: string;
  summary: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: ISODateTimeString;
}
