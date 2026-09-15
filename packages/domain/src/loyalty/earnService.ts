import type { LoyaltyTransaction, Order, StaffUserId } from "@lua/types";
import type { LoyaltyRepository } from "../repositories/loyaltyRepository";
import { calculatePointsEarned, tierMultiplierFor } from "./earning";

export interface EarnServiceDeps {
  loyalty: LoyaltyRepository;
}

/**
 * Scenario A from docs/ARCHITECTURE.md: a confirmed purchase earns
 * points. Keyed by orderId so scanning/confirming the same order twice
 * (e.g. a flaky network retry on the staff device) never double-earns.
 */
export class EarnService {
  private readonly loyalty: LoyaltyRepository;

  constructor(deps: EarnServiceDeps) {
    this.loyalty = deps.loyalty;
  }

  async earnForCompletedOrder(
    order: Order,
    staffUserId?: StaffUserId,
  ): Promise<LoyaltyTransaction | null> {
    if (!order.customerId) return null;
    if (order.status !== "COMPLETED") return null;

    const program = await this.loyalty.getProgram();
    const account = await this.loyalty.getAccount(order.customerId);
    const multiplier = tierMultiplierFor(account.lifetimePointsEarned, program);
    const points = calculatePointsEarned(order.total, program, {
      tierMultiplier: multiplier,
    });
    if (points <= 0) return null;

    return this.loyalty.appendTransaction({
      customerId: order.customerId,
      type: "earn",
      points,
      reason: `Purchase ${order.id}`,
      orderId: order.id,
      performedByStaffId: staffUserId,
      idempotencyKey: `earn:${order.id}`,
    });
  }
}
