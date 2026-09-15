import type { LocaleCode } from "@lua/types";

const INTL_LOCALE: Record<LocaleCode, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-US",
};

export function formatOrderDateTime(iso: string, locale: LocaleCode = "ru"): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart}, ${timePart}`;
}

export function formatShortDate(iso: string, locale: LocaleCode = "ru"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}
