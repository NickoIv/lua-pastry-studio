import type { LocaleCode } from "@lua/types";
import ru from "./locales/ru";
import kk from "./locales/kk";
import en from "./locales/en";

export type TranslationKey = keyof typeof ru;

export const DICTIONARIES: Record<LocaleCode, Record<TranslationKey, string>> = {
  ru,
  kk,
  en,
};

export const SUPPORTED_LOCALES: LocaleCode[] = ["ru", "kk", "en"];

export type Translate = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function createTranslator(locale: LocaleCode): Translate {
  const dictionary = DICTIONARIES[locale];
  return (key, vars) => interpolate(dictionary[key], vars);
}
