import { describe, expect, it } from "vitest";
import { formatPoints, formatPointsSigned } from "../src/points";

const NON_BREAKING_SPACES = new RegExp(
  `[${String.fromCharCode(0x00a0)}${String.fromCharCode(0x202f)}]`,
  "g",
);

describe("formatPoints (ru pluralization)", () => {
  it("uses балл for 1, 21, 101", () => {
    expect(formatPoints(1)).toContain("балл");
    expect(formatPoints(21)).toContain("21 балл");
  });

  it("uses балла for 2-4 (excluding 12-14)", () => {
    expect(formatPoints(2)).toContain("балла");
    expect(formatPoints(3)).toContain("балла");
  });

  it("uses баллов for 0, 5-20, 11-14", () => {
    const formatted = formatPoints(3288).replace(NON_BREAKING_SPACES, " ");
    expect(formatted).toBe("3 288 баллов");
    expect(formatPoints(11)).toContain("баллов");
    expect(formatPoints(0)).toContain("баллов");
  });
});

describe("formatPointsSigned", () => {
  it("prefixes + for a positive earn amount, matching the 405-point example", () => {
    expect(formatPointsSigned(405)).toBe("+405 баллов");
  });

  it("does not double-prefix a negative redemption amount", () => {
    const formatted = formatPointsSigned(-2500).replace(NON_BREAKING_SPACES, " ");
    expect(formatted).toBe("-2 500 баллов");
  });
});
