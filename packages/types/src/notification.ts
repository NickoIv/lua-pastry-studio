import type { Id, ISODateTimeString } from "./common";
import type { CustomerId } from "./customer";

export type NotificationId = Id<"Notification">;

export const NOTIFICATION_KINDS = [
  "order_completed",
  "points_earned",
  "reward_redeemed",
  "birthday_bonus",
  "promotion",
  "system",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface Notification {
  id: NotificationId;
  customerId: CustomerId;
  kind: NotificationKind;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: ISODateTimeString;
}
