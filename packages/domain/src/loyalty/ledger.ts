import type { LoyaltyTransaction } from "@lua/types";

/**
 * The account balance is only ever a cache. This recomputes it from the
 * raw ledger so tests (and, later, a reconciliation job) can prove the
 * cache never drifts from the source of truth.
 */
export function balanceFromLedger(transactions: readonly LoyaltyTransaction[]): number {
  return transactions.reduce((total, tx) => total + tx.points, 0);
}

export function lifetimeEarnedFromLedger(
  transactions: readonly LoyaltyTransaction[],
): number {
  return transactions
    .filter((tx) => tx.points > 0)
    .reduce((total, tx) => total + tx.points, 0);
}

export class InsufficientPointsError extends Error {
  constructor(
    readonly balance: number,
    readonly requested: number,
  ) {
    super(`Insufficient points balance: have ${balance}, need ${requested}`);
    this.name = "InsufficientPointsError";
  }
}

/** Guards every debit — call before appending any negative-points transaction. */
export function assertSufficientBalance(balance: number, points: number): void {
  if (points > balance) {
    throw new InsufficientPointsError(balance, points);
  }
}
