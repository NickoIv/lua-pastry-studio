import { MINOR_UNITS_PER_MAJOR, type LocaleCode, type Money } from "@lua/types";

const INTL_LOCALE: Record<LocaleCode, string> = {
  ru: "ru-KZ",
  kk: "kk-KZ",
  en: "en-US",
};

/**
 * KZT is conventionally displayed with no decimals in everyday UI
 * (prices are always whole tenge), so this drops the minor-unit
 * remainder for display only — the stored Money value stays exact.
 */
export function formatMoney(amount: Money, locale: LocaleCode = "ru"): string {
  const major = amount.minorUnits / MINOR_UNITS_PER_MAJOR[amount.currency];
  const formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: amount.currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return formatter.format(major);
}

export function formatMoneySigned(amount: Money, locale: LocaleCode = "ru"): string {
  const formatted = formatMoney(amount, locale);
  return amount.minorUnits > 0 ? `+${formatted}` : formatted;
}
