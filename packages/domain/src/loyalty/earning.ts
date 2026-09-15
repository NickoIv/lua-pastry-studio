import type { LoyaltyProgram, Money } from "@lua/types";
import { MINOR_UNITS_PER_MAJOR } from "@lua/types";

/**
 * Converts a completed order's total into whole loyalty points using the
 * currently configured program — never a hard-coded percentage. Returns
 * 0 for orders below the program's minimum, so promo/free items can't
 * farm points.
 */
export function calculatePointsEarned(
  orderTotal: Money,
  program: LoyaltyProgram,
  options: { tierMultiplier?: number } = {},
): number {
  if (!program.isActive) return 0;
  if (orderTotal.minorUnits < program.minOrderAmountForEarnMinorUnits) return 0;

  const majorAmount = orderTotal.minorUnits / MINOR_UNITS_PER_MAJOR[orderTotal.currency];
  const tierMultiplier = options.tierMultiplier ?? 1;
  const rawPoints = majorAmount * program.earnRatePerCurrencyUnit * tierMultiplier;

  switch (program.pointsRoundingStrategy) {
    case "floor":
      return Math.max(0, Math.floor(rawPoints));
    case "ceil":
      return Math.max(0, Math.ceil(rawPoints));
    case "round":
    default:
      return Math.max(0, Math.round(rawPoints));
  }
}

export function tierMultiplierFor(
  lifetimePoints: number,
  program: LoyaltyProgram,
): number {
  if (!program.tiers || program.tiers.length === 0) return 1;
  const eligible = program.tiers
    .filter((tier) => lifetimePoints >= tier.minLifetimePoints)
    .sort((a, b) => b.minLifetimePoints - a.minLifetimePoints);
  return eligible[0]?.earnRateMultiplier ?? 1;
}

export const DEFAULT_LOYALTY_PROGRAM: LoyaltyProgram = {
  id: "default",
  isActive: true,
  earnRatePerCurrencyUnit: 0.05,
  pointsRoundingStrategy: "round",
  minOrderAmountForEarnMinorUnits: 0,
  birthdayBonusPoints: 1000,
  pointsExpireAfterDays: 365,
  tiers: [
    { name: "Lua", minLifetimePoints: 0, earnRateMultiplier: 1 },
    { name: "Lua Gold", minLifetimePoints: 20000, earnRateMultiplier: 1.25 },
  ],
};
