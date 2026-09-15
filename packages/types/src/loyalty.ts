import type { Id, ISODateTimeString } from "./common";
import type { CustomerId } from "./customer";
import type { OrderId } from "./order";
import type { StaffUserId } from "./staff";
import type { RewardRedemptionId } from "./reward";

export type LoyaltyAccountId = Id<"LoyaltyAccount">;
export type LoyaltyTransactionId = Id<"LoyaltyTransaction">;

/**
 * The account row stores the current balance for fast reads, but it is
 * a cache, not the source of truth — the source of truth is the
 * append-only LoyaltyTransaction ledger, and balance = sum(ledger).
 * See packages/domain/src/loyalty/ledger.ts.
 */
export interface LoyaltyAccount {
  id: LoyaltyAccountId;
  customerId: CustomerId;
  pointsBalance: number;
  lifetimePointsEarned: number;
  tier?: string;
  updatedAt: ISODateTimeString;
}

export const LOYALTY_TRANSACTION_TYPES = [
  "earn",
  "redeem",
  "refund",
  "manual_adjustment",
  "birthday_bonus",
  "campaign_bonus",
  "expiration",
  "reversal",
] as const;
export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPES)[number];

/**
 * One immutable ledger entry. `points` carries its own sign (earn > 0,
 * redeem < 0) so that balance-from-ledger is a plain sum — no branching
 * on `type` needed at read time.
 */
export interface LoyaltyTransaction {
  id: LoyaltyTransactionId;
  accountId: LoyaltyAccountId;
  customerId: CustomerId;
  type: LoyaltyTransactionType;
  points: number;
  orderId?: OrderId;
  rewardRedemptionId?: RewardRedemptionId;
  performedByStaffId?: StaffUserId;
  reason: string;
  metadata?: Record<string, string | number | boolean>;
  idempotencyKey?: string;
  createdAt: ISODateTimeString;
}

/**
 * Program-level configuration — never hard-code an earn rate in UI or
 * domain logic. All values here are meant to be edited from Lua Admin.
 */
export interface LoyaltyProgram {
  id: string;
  isActive: boolean;
  /** Points earned per 1 major currency unit spent, e.g. 0.05 = 5%. */
  earnRatePerCurrencyUnit: number;
  pointsRoundingStrategy: "floor" | "round" | "ceil";
  minOrderAmountForEarnMinorUnits: number;
  birthdayBonusPoints: number;
  pointsExpireAfterDays: number | null;
  tiers?: LoyaltyTier[];
}

export interface LoyaltyTier {
  name: string;
  minLifetimePoints: number;
  earnRateMultiplier: number;
}
