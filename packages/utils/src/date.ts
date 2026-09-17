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

/**
 * A plain `YYYY-MM-DD` DATE value (birth date, etc.) → locale-appropriate
 * display, e.g. "18.06.1993" for ru/kk, "06/18/1993" for en. Deliberately
 * a string split, never `new Date(iso)` — a DATE column has no time-of-day
 * or timezone, and routing it through Date/Intl risks shifting the
 * calendar day in a viewer whose local timezone differs, exactly the bug
 * packages/server/src/validation.ts's readOptionalDateOnly guards
 * against on the write side. See docs/ARCHITECTURE.md "Timezones".
 */
export function formatDateOnly(isoDate: string, locale: LocaleCode = "ru"): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  if (!year || !month || !day) return isoDate;
  return locale === "en" ? `${month}/${day}/${year}` : `${day}.${month}.${year}`;
}
