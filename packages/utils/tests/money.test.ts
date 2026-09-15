import { describe, expect, it } from "vitest";
import { money } from "@lua/types";
import { formatMoney, formatMoneySigned } from "../src/money";

const NON_BREAKING_SPACES = new RegExp(
  `[${String.fromCharCode(0x00a0)}${String.fromCharCode(0x202f)}]`,
  "g",
);

describe("formatMoney", () => {
  it("formats whole tenge with no decimals", () => {
    const formatted = formatMoney(money(8100));
    const normalized = formatted.replace(NON_BREAKING_SPACES, " ");
    expect(normalized).toContain("8 100");
    expect(formatted).toContain("₸");
  });

  it("never shows a fractional remainder for KZT", () => {
    expect(formatMoney(money(1900))).not.toMatch(/[.,]\d/);
  });
});

describe("formatMoneySigned", () => {
  it("prefixes a plus sign for positive amounts", () => {
    expect(formatMoneySigned(money(500))).toMatch(/^\+/);
  });
});
