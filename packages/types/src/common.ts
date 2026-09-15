export type ISODateTimeString = string;

export type LocaleCode = "ru" | "kk" | "en";

export type LocalizedText = Record<LocaleCode, string>;

/** Branded id helper — keeps e.g. CustomerId and OrderId from being interchangeable strings. */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

export function asId<Brand extends string>(value: string): Id<Brand> {
  return value as Id<Brand>;
}
