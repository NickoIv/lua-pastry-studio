import { describe, expect, it } from "vitest";
import { asId, type LoyaltyTransaction } from "@lua/types";
import {
  InsufficientPointsError,
  assertSufficientBalance,
  balanceFromLedger,
  lifetimeEarnedFromLedger,
} from "../src/loyalty/ledger";

function tx(
  points: number,
  type: LoyaltyTransaction["type"] = "earn",
): LoyaltyTransaction {
  return {
    id: asId(`ltx_${Math.random()}`),
    accountId: asId("acct_1"),
    customerId: asId("cust_1"),
    type,
    points,
    reason: "test",
    createdAt: new Date().toISOString(),
  };
}

describe("balanceFromLedger", () => {
  it("is a plain sum of signed points", () => {
    const txs = [
      tx(1000, "manual_adjustment"),
      tx(405, "earn"),
      tx(-2500, "redeem"),
      tx(1000, "birthday_bonus"),
    ];
    expect(balanceFromLedger(txs)).toBe(-95);
  });

  it("reproduces the spec example balance for Nikolay", () => {
    const txs = [
      tx(3353, "manual_adjustment"),
      tx(265),
      tx(340),
      tx(1000, "birthday_bonus"),
      tx(-2500, "redeem"),
      tx(425),
      tx(405),
    ];
    expect(balanceFromLedger(txs)).toBe(3288);
  });

  it("returns 0 for an empty ledger", () => {
    expect(balanceFromLedger([])).toBe(0);
  });
});

describe("lifetimeEarnedFromLedger", () => {
  it("ignores negative (redeem/expiration) entries", () => {
    const txs = [tx(1000), tx(-400, "redeem"), tx(200)];
    expect(lifetimeEarnedFromLedger(txs)).toBe(1200);
  });
});

describe("assertSufficientBalance", () => {
  it("allows spending exactly the full balance", () => {
    expect(() => assertSufficientBalance(2500, 2500)).not.toThrow();
  });

  it("throws InsufficientPointsError when overdrawing", () => {
    expect(() => assertSufficientBalance(788, 2500)).toThrow(InsufficientPointsError);
  });
});
