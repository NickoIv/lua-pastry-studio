import type {
  CustomerId,
  LoyaltyTransaction,
  Reward,
  RewardRedemption,
  StaffUserId,
} from "@lua/types";
import type { LoyaltyRepository } from "../repositories/loyaltyRepository";
import type { RewardsRepository } from "../repositories/rewardsRepository";
import { assertSufficientBalance } from "./ledger";

export class RewardNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RewardNotAvailableError";
  }
}

export class RedemptionNotPendingError extends Error {
  constructor(readonly status: string) {
    super(`Redemption is not pending (status: ${status})`);
    this.name = "RedemptionNotPendingError";
  }
}

export interface RedemptionServiceDeps {
  loyalty: LoyaltyRepository;
  rewards: RewardsRepository;
  /** Injected for testability; defaults to Date.now-based ISO string. */
  now?: () => Date;
  /** Seconds a reward QR / pending redemption stays valid. */
  redemptionTtlSeconds?: number;
}

/**
 * Implements the two-phase "buy with points" flow from
 * docs/ARCHITECTURE.md: choosing a reward never touches the ledger —
 * only a staff-confirmed fulfillment does, and it does so exactly once.
 */
export class RedemptionService {
  private readonly loyalty: LoyaltyRepository;
  private readonly rewards: RewardsRepository;
  private readonly now: () => Date;
  private readonly redemptionTtlSeconds: number;

  constructor(deps: RedemptionServiceDeps) {
    this.loyalty = deps.loyalty;
    this.rewards = deps.rewards;
    this.now = deps.now ?? (() => new Date());
    this.redemptionTtlSeconds = deps.redemptionTtlSeconds ?? 120;
  }

  /**
   * Step 1 (guest taps "Get for points"). Validates the reward and the
   * guest's current balance, but appends nothing to the ledger — points
   * remain untouched until a staff device confirms fulfillment.
   */
  async requestRedemption(
    customerId: CustomerId,
    reward: Reward,
  ): Promise<RewardRedemption> {
    if (!reward.isActive) {
      throw new RewardNotAvailableError(`Reward ${reward.id} is not active`);
    }
    if (reward.stock !== null && reward.stock <= 0) {
      throw new RewardNotAvailableError(`Reward ${reward.id} is out of stock`);
    }

    const account = await this.loyalty.getAccount(customerId);
    assertSufficientBalance(account.pointsBalance, reward.pointsCost);

    const expiresAt = new Date(
      this.now().getTime() + this.redemptionTtlSeconds * 1000,
    ).toISOString();

    return this.rewards.createRedemption({
      rewardId: reward.id,
      customerId,
      pointsCost: reward.pointsCost,
      expiresAt,
    });
  }

  /**
   * Step 2 (staff scans the reward QR and confirms handover). This is
   * the only place points for a redemption are deducted, it is
   * idempotent via the redemption id, and it re-validates the balance
   * so a stale/expired session can never push someone negative.
   */
  async fulfillRedemption(
    redemptionId: string,
    staffUserId: StaffUserId,
  ): Promise<{ redemption: RewardRedemption; transaction: LoyaltyTransaction }> {
    const redemption = await this.rewards.getRedemption(
      redemptionId as RewardRedemption["id"],
    );
    if (!redemption) {
      throw new RewardNotAvailableError(`Redemption ${redemptionId} not found`);
    }
    if (redemption.status !== "PENDING") {
      throw new RedemptionNotPendingError(redemption.status);
    }
    if (new Date(redemption.expiresAt).getTime() < this.now().getTime()) {
      await this.rewards.updateRedemptionStatus(redemption.id, "EXPIRED");
      throw new RewardNotAvailableError(`Redemption ${redemptionId} has expired`);
    }

    const account = await this.loyalty.getAccount(redemption.customerId);
    assertSufficientBalance(account.pointsBalance, redemption.pointsCost);

    const transaction = await this.loyalty.appendTransaction({
      customerId: redemption.customerId,
      type: "redeem",
      points: -redemption.pointsCost,
      reason: `Redeemed reward ${redemption.rewardId}`,
      rewardRedemptionId: redemption.id,
      performedByStaffId: staffUserId,
      idempotencyKey: `redemption:${redemption.id}`,
    });

    const fulfilled = await this.rewards.updateRedemptionStatus(
      redemption.id,
      "FULFILLED",
      {
        fulfilledByStaffId: staffUserId,
        fulfilledAt: this.now().toISOString(),
        loyaltyTransactionId: transaction.id,
      },
    );

    return { redemption: fulfilled, transaction };
  }

  async cancelRedemption(redemptionId: string): Promise<RewardRedemption> {
    return this.rewards.updateRedemptionStatus(
      redemptionId as RewardRedemption["id"],
      "CANCELLED",
    );
  }
}
