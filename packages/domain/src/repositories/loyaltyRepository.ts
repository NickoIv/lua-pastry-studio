import type {
  CustomerId,
  LoyaltyAccount,
  LoyaltyProgram,
  LoyaltyTransaction,
  LoyaltyTransactionType,
} from "@lua/types";

export interface AppendTransactionInput {
  customerId: CustomerId;
  type: LoyaltyTransactionType;
  points: number;
  reason: string;
  orderId?: string;
  rewardRedemptionId?: string;
  performedByStaffId?: string;
  metadata?: Record<string, string | number | boolean>;
  idempotencyKey?: string;
}

export interface LoyaltyRepository {
  getProgram(): Promise<LoyaltyProgram>;
  /** Admin-only: persists new program settings (earn rate, birthday bonus, expiry, tiers). */
  updateProgram(patch: Partial<LoyaltyProgram>): Promise<LoyaltyProgram>;
  getAccount(customerId: CustomerId): Promise<LoyaltyAccount>;
  listTransactions(customerId: CustomerId): Promise<LoyaltyTransaction[]>;
  /**
   * Appends one ledger entry and returns the account with its balance
   * recomputed from the ledger. Implementations MUST treat this as
   * atomic and MUST honor `idempotencyKey` (a repeat call with the same
   * key returns the original result instead of double-applying it).
   */
  appendTransaction(input: AppendTransactionInput): Promise<LoyaltyTransaction>;
}
