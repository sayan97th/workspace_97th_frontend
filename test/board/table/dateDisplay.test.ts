import { describe, expect, test } from "vitest";
import { fmtClock, formatDateParts, formatDateValue } from "@/components/board/table/dateUtils";

const NOV_5 = { year: 2026, month: 11, day: 5, time: null };

describe("formatDateParts", () => {
  test.each([
    ["month_day_year", "Nov 5, 2026"],
    ["day_month_year", "5 Nov, 2026"],
    ["weekday_month_day", "Thu, Nov 5"],
    ["month_day", "Nov 5"],
    ["us_numeric", "11/05/2026"],
    ["eu_numeric", "05/11/2026"],
    ["iso", "2026-11-05"],
  ] as const)("%s reads %s", (format, expected) => {
    expect(formatDateParts(NOV_5, format, "12")).toBe(expected);
  });

  test("adds the time in the column's clock", () => {
    const parts = { ...NOV_5, time: { hours: 14, minutes: 5 } };
    expect(formatDateParts(parts, "eu_numeric", "24")).toBe("05/11/2026, 14:05");
    expect(formatDateParts(parts, "eu_numeric", "12")).toBe("05/11/2026, 2:05 PM");
  });
});

describe("fmtClock", () => {
  test("midnight and noon", () => {
    expect(fmtClock(0, 0, "12")).toBe("12:00 AM");
    expect(fmtClock(12, 30, "12")).toBe("12:30 PM");
    expect(fmtClock(0, 0, "24")).toBe("00:00");
  });
});

describe("formatDateValue", () => {
  test("without a setting it keeps the Date cell's original look", () => {
    expect(formatDateValue("2026-11-05", undefined)).toBe("Nov 5, 2026");
    expect(formatDateValue("2026-11-05T09:30", undefined)).toBe("Nov 5, 2026, 9:30AM");
  });

  test("uses the picked format and clock", () => {
    expect(formatDateValue("2026-11-05T09:30", { format: "iso", time_format: "24" })).toBe("2026-11-05, 09:30");
    expect(formatDateValue("2026-11-05", { format: "auto", time_format: "24" })).toBe("Nov 5, 2026");
  });

  test("an unreadable value shows nothing", () => {
    expect(formatDateValue("soon", { format: "iso", time_format: "12" })).toBe("");
    expect(formatDateValue(undefined, undefined)).toBe("");
  });
});
