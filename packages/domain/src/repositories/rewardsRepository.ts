import type {
  CustomerId,
  Reward,
  RewardId,
  RewardRedemption,
  RewardRedemptionId,
  RewardRedemptionStatus,
} from "@lua/types";

export interface RewardsRepository {
  listRewards(): Promise<Reward[]>;
  getReward(id: RewardId): Promise<Reward | null>;
  listRedemptionsByCustomer(customerId: CustomerId): Promise<RewardRedemption[]>;
  getRedemption(id: RewardRedemptionId): Promise<RewardRedemption | null>;
  createRedemption(input: {
    rewardId: RewardId;
    customerId: CustomerId;
    pointsCost: number;
    expiresAt: string;
  }): Promise<RewardRedemption>;
  updateRedemptionStatus(
    id: RewardRedemptionId,
    status: RewardRedemptionStatus,
    patch?: Partial<RewardRedemption>,
  ): Promise<RewardRedemption>;
}
