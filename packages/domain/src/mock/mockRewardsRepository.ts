import {
  asId,
  type CustomerId,
  type Reward,
  type RewardId,
  type RewardRedemption,
  type RewardRedemptionId,
  type RewardRedemptionStatus,
} from "@lua/types";
import type { RewardsRepository } from "../repositories/rewardsRepository";
import type { MockStore } from "./store";

export class MockRewardsRepository implements RewardsRepository {
  constructor(private readonly store: MockStore) {}

  async listRewards(): Promise<Reward[]> {
    return [...this.store.rewards];
  }

  async getReward(id: RewardId): Promise<Reward | null> {
    return this.store.rewards.find((r) => r.id === id) ?? null;
  }

  async listRedemptionsByCustomer(customerId: CustomerId): Promise<RewardRedemption[]> {
    return this.store.rewardRedemptions
      .filter((r) => r.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRedemption(id: RewardRedemptionId): Promise<RewardRedemption | null> {
    return this.store.rewardRedemptions.find((r) => r.id === id) ?? null;
  }

  async createRedemption(input: {
    rewardId: RewardId;
    customerId: CustomerId;
    pointsCost: number;
    expiresAt: string;
  }): Promise<RewardRedemption> {
    const redemption: RewardRedemption = {
      id: asId(`redm_${crypto.randomUUID()}`),
      rewardId: input.rewardId,
      customerId: input.customerId,
      pointsCost: input.pointsCost,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    this.store.rewardRedemptions.push(redemption);
    return redemption;
  }

  async updateRedemptionStatus(
    id: RewardRedemptionId,
    status: RewardRedemptionStatus,
    patch?: Partial<RewardRedemption>,
  ): Promise<RewardRedemption> {
    const index = this.store.rewardRedemptions.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Redemption ${id} not found`);
    const updated: RewardRedemption = {
      ...this.store.rewardRedemptions[index]!,
      ...patch,
      status,
    };
    this.store.rewardRedemptions[index] = updated;
    return updated;
  }
}
