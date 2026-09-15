/**
 * Money is always an integer count of the currency's minor unit
 * (e.g. tiyn for KZT), never a float — this rules out an entire class
 * of rounding bugs in totals, discounts and refunds.
 */
export type CurrencyCode = "KZT";

export const MINOR_UNITS_PER_MAJOR: Record<CurrencyCode, number> = {
  KZT: 100,
};

export interface Money {
  readonly currency: CurrencyCode;
  /** Integer amount in the currency's minor unit. Never negative on its own — direction is modeled by the field that holds the Money (e.g. a refund), not by sign tricks on the amount. */
  readonly minorUnits: number;
}

export function money(majorAmount: number, currency: CurrencyCode = "KZT"): Money {
  if (!Number.isFinite(majorAmount)) {
    throw new RangeError(`money(): amount must be finite, got ${majorAmount}`);
  }
  const minorUnits = Math.round(majorAmount * MINOR_UNITS_PER_MAJOR[currency]);
  return { currency, minorUnits };
}

export function zeroMoney(currency: CurrencyCode = "KZT"): Money {
  return { currency, minorUnits: 0 };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { currency: a.currency, minorUnits: a.minorUnits + b.minorUnits };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { currency: a.currency, minorUnits: a.minorUnits - b.minorUnits };
}

export function multiplyMoney(a: Money, factor: number): Money {
  return { currency: a.currency, minorUnits: Math.round(a.minorUnits * factor) };
}

export function sumMoney(items: readonly Money[], currency: CurrencyCode = "KZT"): Money {
  return items.reduce((total, item) => addMoney(total, item), zeroMoney(currency));
}

export function isNegative(a: Money): boolean {
  return a.minorUnits < 0;
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.minorUnits - b.minorUnits;
}
