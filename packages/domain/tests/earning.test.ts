import { describe, expect, it } from "vitest";
import { money } from "@lua/types";
import {
  DEFAULT_LOYALTY_PROGRAM,
  calculatePointsEarned,
  tierMultiplierFor,
} from "../src/loyalty/earning";

describe("calculatePointsEarned", () => {
  it("matches the spec example: 8 100 KZT at 5% earns 405 points", () => {
    expect(calculatePointsEarned(money(8100), DEFAULT_LOYALTY_PROGRAM)).toBe(405);
  });

  it("returns 0 when the program is inactive", () => {
    expect(
      calculatePointsEarned(money(8100), { ...DEFAULT_LOYALTY_PROGRAM, isActive: false }),
    ).toBe(0);
  });

  it("returns 0 below the minimum order amount", () => {
    const program = {
      ...DEFAULT_LOYALTY_PROGRAM,
      minOrderAmountForEarnMinorUnits: 100_000,
    };
    expect(calculatePointsEarned(money(500), program)).toBe(0);
  });

  it("applies a tier multiplier", () => {
    expect(
      calculatePointsEarned(money(8100), DEFAULT_LOYALTY_PROGRAM, {
        tierMultiplier: 1.25,
      }),
    ).toBe(506); // 405 * 1.25 = 506.25 -> round
  });

  it("respects the rounding strategy", () => {
    const floorProgram = {
      ...DEFAULT_LOYALTY_PROGRAM,
      pointsRoundingStrategy: "floor" as const,
    };
    expect(calculatePointsEarned(money(99), floorProgram)).toBe(4); // 4.95 -> floor
  });

  it("never returns negative points", () => {
    const program = { ...DEFAULT_LOYALTY_PROGRAM, earnRatePerCurrencyUnit: -1 };
    expect(calculatePointsEarned(money(100), program)).toBe(0);
  });
});

describe("tierMultiplierFor", () => {
  it("picks the highest eligible tier", () => {
    expect(tierMultiplierFor(25000, DEFAULT_LOYALTY_PROGRAM)).toBe(1.25);
    expect(tierMultiplierFor(500, DEFAULT_LOYALTY_PROGRAM)).toBe(1);
  });
});
