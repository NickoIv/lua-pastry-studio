import { randomBytes } from "node:crypto";
import { AppError } from "./errors";

/** All admin catalog forms require at least a Russian name — kk/en fall back to it if omitted, never left blank in the DB. */
export function readLocalizedText(value: unknown, fallback?: Record<string, string>): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    if (fallback) return fallback;
    throw new AppError("VALIDATION", 422);
  }
  const obj = value as Record<string, unknown>;
  const ru = obj.ru;
  if (typeof ru !== "string" || ru.trim().length === 0) {
    if (fallback) return fallback;
    throw new AppError("VALIDATION", 422);
  }
  const kk = typeof obj.kk === "string" && obj.kk.trim() ? obj.kk : ru;
  const en = typeof obj.en === "string" && obj.en.trim() ? obj.en : ru;
  return { ru, kk, en };
}

export function readOptionalLocalizedText(value: unknown): Record<string, string> | null {
  if (value === undefined || value === null) return null;
  return readLocalizedText(value);
}

export function readNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("VALIDATION", 422);
  }
  void fieldName;
  return value.trim();
}

// Cyrillic -> Latin transliteration, just enough to turn a Russian/Kazakh
// product/category name into a readable slug (ru/kk share most letters;
// the handful of Kazakh-only letters map to a reasonable Latin approximation).
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", і: "i", к: "k", қ: "k", л: "l", м: "m", н: "n",
  ң: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ұ: "u",
  ү: "u", ф: "f", х: "h", һ: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");
}

/**
 * Turns any admin-entered name into a URL-safe slug. Falls back to a
 * short random suffix if transliteration still produces nothing usable
 * (e.g. an emoji-only name) rather than silently accepting an empty slug.
 */
export function readSlug(value: unknown): string {
  const raw = readNonEmptyString(value, "slug");
  const base = transliterate(raw)
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `item-${randomBytes(3).toString("hex")}`;
}

/** Admin forms submit price in whole KZT (major units); stored as integer minor units (×100). */
export function readPriceMinorUnits(value: unknown): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num) || num < 0) {
    throw new AppError("VALIDATION", 422);
  }
  return Math.round(num * 100);
}

export function readPositiveInt(value: unknown, fieldName: string): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isInteger(num) || num < 0) {
    throw new AppError("VALIDATION", 422);
  }
  void fieldName;
  return num;
}

export function readOptionalPositiveInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return readPositiveInt(value, "value");
}

export function readBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

export function readStringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AppError("VALIDATION", 422);
  return value.filter((v): v is string => typeof v === "string");
}
