import type { LocaleCode, Money as MoneyValue } from "@lua/types";
import { formatMoney, formatMoneySigned } from "@lua/utils";

export interface MoneyProps {
  value: MoneyValue;
  signed?: boolean;
  locale?: LocaleCode;
  className?: string;
}

/** The only place order/reward UIs should turn a Money value into text — keeps formatting consistent everywhere. */
export function Money({ value, signed = false, locale = "ru", className }: MoneyProps) {
  return (
    <span className={className}>
      {signed ? formatMoneySigned(value, locale) : formatMoney(value, locale)}
    </span>
  );
}
