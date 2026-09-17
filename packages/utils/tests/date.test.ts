import { describe, expect, it } from "vitest";
import { formatDateOnly } from "../src/date";

describe("formatDateOnly", () => {
  it("formats a DATE-only string as DD.MM.YYYY for ru/kk", () => {
    expect(formatDateOnly("1993-06-18")).toBe("18.06.1993");
    expect(formatDateOnly("1993-06-18", "kk")).toBe("18.06.1993");
  });

  it("formats as MM/DD/YYYY for en", () => {
    expect(formatDateOnly("1993-06-18", "en")).toBe("06/18/1993");
  });

  it("never shifts the calendar day regardless of viewer timezone (no Date object involved)", () => {
    // A regression guard for the exact bug class documented in
    // packages/server/src/validation.ts#readOptionalDateOnly: routing a
    // DATE-only value through `new Date(iso)` can roll the day backward
    // in a negative-UTC-offset viewer. Pure string parsing can't do that.
    expect(formatDateOnly("2000-01-01")).toBe("01.01.2000");
    expect(formatDateOnly("2000-12-31")).toBe("31.12.2000");
  });

  it("tolerates a full ISO timestamp by only reading the date portion", () => {
    expect(formatDateOnly("1993-06-18T00:00:00.000Z")).toBe("18.06.1993");
  });
});
