import { beforeEach, describe, expect, it } from "vitest";
import { asId } from "@lua/types";
import { createMockStore, type MockStore } from "../src/mock/store";
import { MockLoyaltyRepository } from "../src/mock/mockLoyaltyRepository";
import { MockRewardsRepository } from "../src/mock/mockRewardsRepository";
import { RedemptionService, RedemptionNotPendingError } from "../src/loyalty/redemption";
import { InsufficientPointsError } from "../src/loyalty/ledger";

const NIKOLAY = asId("cust_nikolay");
const PETIT_PRINCE = asId("rwd_petit_prince");

describe("RedemptionService (buy-with-points flow)", () => {
  let store: MockStore;
  let loyalty: MockLoyaltyRepository;
  let rewards: MockRewardsRepository;
  let service: RedemptionService;

  beforeEach(() => {
    store = createMockStore();
    loyalty = new MockLoyaltyRepository(store);
    rewards = new MockRewardsRepository(store);
    service = new RedemptionService({ loyalty, rewards, redemptionTtlSeconds: 90 });
  });

  it("starts Nikolay at the spec's example balance of 3 288 points", async () => {
    const account = await loyalty.getAccount(NIKOLAY);
    expect(account.pointsBalance).toBe(3288);
  });

  it("does NOT touch the ledger when a redemption is only requested", async () => {
    const reward = await rewards.getReward(PETIT_PRINCE);
    await service.requestRedemption(NIKOLAY, reward!);

    const account = await loyalty.getAccount(NIKOLAY);
    expect(account.pointsBalance).toBe(3288);
  });

  it("deducts points only once staff confirms fulfillment: 3288 - 2500 = 788", async () => {
    const reward = await rewards.getReward(PETIT_PRINCE);
    const redemption = await service.requestRedemption(NIKOLAY, reward!);

    const beforeFulfill = await loyalty.getAccount(NIKOLAY);
    expect(beforeFulfill.pointsBalance).toBe(3288);

    const { redemption: fulfilled } = await service.fulfillRedemption(
      redemption.id,
      asId("staff_aigerim"),
    );

    expect(fulfilled.status).toBe("FULFILLED");
    const afterFulfill = await loyalty.getAccount(NIKOLAY);
    expect(afterFulfill.pointsBalance).toBe(788);
  });

  it("rejects a request when the balance is insufficient", async () => {
    const reward = await rewards.getReward(PETIT_PRINCE);
    // Drain Nikolay's balance first.
    await loyalty.appendTransaction({
      customerId: NIKOLAY,
      type: "manual_adjustment",
      points: -3288,
      reason: "test drain",
    });

    await expect(service.requestRedemption(NIKOLAY, reward!)).rejects.toBeInstanceOf(
      InsufficientPointsError,
    );
  });

  it("cannot fulfill the same redemption twice (no double-spend on retry)", async () => {
    const reward = await rewards.getReward(PETIT_PRINCE);
    const redemption = await service.requestRedemption(NIKOLAY, reward!);
    await service.fulfillRedemption(redemption.id, asId("staff_aigerim"));

    await expect(
      service.fulfillRedemption(redemption.id, asId("staff_aigerim")),
    ).rejects.toBeInstanceOf(RedemptionNotPendingError);

    const account = await loyalty.getAccount(NIKOLAY);
    expect(account.pointsBalance).toBe(788);
  });
});
