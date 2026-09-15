import type { LocaleCode } from "@lua/types";
import { formatPoints, formatPointsSigned } from "@lua/utils";

export interface PointsProps {
  value: number;
  signed?: boolean;
  locale?: LocaleCode;
  className?: string;
}

export function Points({ value, signed = false, locale = "ru", className }: PointsProps) {
  return (
    <span className={className}>
      {signed ? formatPointsSigned(value, locale) : formatPoints(value, locale)}
    </span>
  );
}
