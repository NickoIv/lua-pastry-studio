import {
  asId,
  type CustomerId,
  type LoyaltyAccount,
  type LoyaltyProgram,
  type LoyaltyTransaction,
} from "@lua/types";
import type {
  AppendTransactionInput,
  LoyaltyRepository,
} from "../repositories/loyaltyRepository";
import type { MockStore } from "./store";
import { balanceFromLedger, lifetimeEarnedFromLedger } from "../loyalty/ledger";

export class MockLoyaltyRepository implements LoyaltyRepository {
  constructor(private readonly store: MockStore) {}

  async getProgram(): Promise<LoyaltyProgram> {
    return this.store.loyaltyProgram;
  }

  async updateProgram(patch: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> {
    this.store.loyaltyProgram = { ...this.store.loyaltyProgram, ...patch };
    return this.store.loyaltyProgram;
  }

  async getAccount(customerId: CustomerId): Promise<LoyaltyAccount> {
    const txs = this.transactionsFor(customerId);
    return {
      id: asId(`acct_${customerId}`),
      customerId,
      pointsBalance: balanceFromLedger(txs),
      lifetimePointsEarned: lifetimeEarnedFromLedger(txs),
      tier: balanceFromLedger(txs) >= 20000 ? "Lua Gold" : "Lua",
      updatedAt: txs.at(-1)?.createdAt ?? new Date().toISOString(),
    };
  }

  async listTransactions(customerId: CustomerId): Promise<LoyaltyTransaction[]> {
    return this.transactionsFor(customerId);
  }

  async appendTransaction(input: AppendTransactionInput): Promise<LoyaltyTransaction> {
    if (input.idempotencyKey) {
      const existing = this.store.loyaltyTransactions.find(
        (t) => t.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return existing;
    }

    const transaction: LoyaltyTransaction = {
      id: asId(`ltx_${crypto.randomUUID()}`),
      accountId: asId(`acct_${input.customerId}`),
      customerId: input.customerId,
      type: input.type,
      points: input.points,
      orderId: input.orderId ? asId(input.orderId) : undefined,
      rewardRedemptionId: input.rewardRedemptionId
        ? asId(input.rewardRedemptionId)
        : undefined,
      performedByStaffId: input.performedByStaffId
        ? asId(input.performedByStaffId)
        : undefined,
      reason: input.reason,
      metadata: input.metadata,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    this.store.loyaltyTransactions.push(transaction);
    return transaction;
  }

  private transactionsFor(customerId: CustomerId): LoyaltyTransaction[] {
    return this.store.loyaltyTransactions
      .filter((t) => t.customerId === customerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
