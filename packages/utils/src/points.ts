import type { LocaleCode } from "@lua/types";

function ruPointsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "балл";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "балла";
  return "баллов";
}

function kkPointsWord(): string {
  return "балл";
}

const NUMBER_LOCALE: Record<LocaleCode, string> = {
  ru: "ru-KZ",
  kk: "kk-KZ",
  en: "en-US",
};

export function formatPoints(points: number, locale: LocaleCode = "ru"): string {
  const abs = Math.abs(points);
  const formattedNumber = new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(points);
  if (locale === "ru") return `${formattedNumber} ${ruPointsWord(abs)}`;
  if (locale === "kk") return `${formattedNumber} ${kkPointsWord()}`;
  return `${formattedNumber} pts`;
}

export function formatPointsSigned(points: number, locale: LocaleCode = "ru"): string {
  const formatted = formatPoints(points, locale);
  return points > 0 ? `+${formatted}` : formatted;
}
