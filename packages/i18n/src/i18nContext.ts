import { createContext } from "react";
import type { LocaleCode } from "@lua/types";
import type { Translate } from "./translator";

export interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: Translate;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
