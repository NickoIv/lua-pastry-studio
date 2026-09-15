import type { Id, ISODateTimeString, LocalizedText } from "./common";
import type { CustomerId } from "./customer";
import type { ProductId } from "./product";
import type { StaffUserId } from "./staff";

export type RewardId = Id<"Reward">;
export type RewardRedemptionId = Id<"RewardRedemption">;

export interface Reward {
  id: RewardId;
  title: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  linkedProductId?: ProductId;
  pointsCost: number;
  isActive: boolean;
  /** Per-customer redemption cap in a rolling window; null = unlimited. */
  perCustomerLimit: number | null;
  perCustomerLimitWindowDays: number | null;
  stock: number | null;
}

export const REWARD_REDEMPTION_STATUSES = [
  "PENDING",
  "FULFILLED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type RewardRedemptionStatus = (typeof REWARD_REDEMPTION_STATUSES)[number];

/**
 * Created the instant a guest taps "Get for points" — status starts at
 * PENDING and points are NOT deducted yet. Only a staff device moving
 * this to FULFILLED (via the linked QRToken) triggers the ledger debit.
 * See packages/domain/src/loyalty/redemption.ts.
 */
export interface RewardRedemption {
  id: RewardRedemptionId;
  rewardId: RewardId;
  customerId: CustomerId;
  pointsCost: number;
  status: RewardRedemptionStatus;
  qrTokenId?: string;
  fulfilledByStaffId?: StaffUserId;
  fulfilledAt?: ISODateTimeString;
  loyaltyTransactionId?: string;
  createdAt: ISODateTimeString;
  expiresAt: ISODateTimeString;
}
