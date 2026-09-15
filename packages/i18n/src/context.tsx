import { useMemo, useState, type ReactNode } from "react";
import type { LocaleCode } from "@lua/types";
import { createTranslator, SUPPORTED_LOCALES } from "./translator";
import { I18nContext, type I18nContextValue } from "./i18nContext";

const STORAGE_KEY = "lua.locale";

function readStoredLocale(fallback: LocaleCode): LocaleCode {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && SUPPORTED_LOCALES.includes(stored as LocaleCode)
      ? (stored as LocaleCode)
      : fallback;
  } catch {
    return fallback;
  }
}

export function I18nProvider({
  children,
  defaultLocale = "ru",
}: {
  children: ReactNode;
  defaultLocale?: LocaleCode;
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(() =>
    readStoredLocale(defaultLocale),
  );

  const setLocale = (next: LocaleCode) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Per-viewer convenience only — a blocked/private-mode storage is fine to ignore.
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: createTranslator(locale) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
