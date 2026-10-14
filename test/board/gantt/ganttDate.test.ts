import { afterEach, describe, expect, test, vi } from "vitest";
import { computeCriticalPath } from "@/components/board/gantt/ganttCriticalPath";
import {
  buildGanttHeader,
  formatGanttDuration,
  formatGanttRange,
  formatGanttRangeCompact,
  getWeekNumber,
  resolveGanttRange,
} from "@/components/board/gantt/ganttDate";

// The Gantt view's date math: the header bands and labels monday.com prints, the
// rendered window, the item list labels and the critical path.

const day = (iso: string) => {
  const [year, month, date] = iso.split("-").map(Number);
  return new Date(year, month - 1, date);
};

afterEach(() => {
  vi.useRealTimers();
});

describe("gantt header", () => {
  test("numbers weeks like monday.com, Sunday start and the week of Jan 1st first", () => {
    expect(getWeekNumber(day("2025-06-08"))).toBe(24);
    expect(getWeekNumber(day("2026-09-27"))).toBe(40);
    expect(getWeekNumber(day("2026-10-13"))).toBe(42);
    expect(getWeekNumber(day("2025-12-31"))).toBe(1);
  });

  test("labels weeks with their day range and the start month when they cross months", () => {
    const header = buildGanttHeader(day("2026-09-27"), day("2026-10-17"), "week");
    expect(header.minor.map((segment) => segment.label)).toEqual(["W40 Sep 27 - 3", "W41 4 - 10", "W42 11 - 17"]);
    expect(header.minor.map((segment) => segment.compact_label)).toEqual(["W40", "W41", "W42"]);
  });

  test("ends month bands on the month's last day, even mid week", () => {
    const header = buildGanttHeader(day("2026-09-27"), day("2026-10-17"), "week");
    expect(header.major.map((segment) => [segment.label, segment.offset_days, segment.days])).toEqual([
      ["September 2026", 0, 4],
      ["October 2026", 4, 17],
    ]);
    expect(header.major[1].strong_label).toBe("October");
  });

  test("marks the segment holding today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(day("2026-10-13"));
    const header = buildGanttHeader(day("2026-09-27"), day("2026-10-17"), "week");
    expect(header.minor.map((segment) => segment.is_today)).toEqual([false, false, true]);
  });

  test("builds quarter, half year and weekend segments", () => {
    expect(buildGanttHeader(day("2026-01-01"), day("2026-12-31"), "quarter").minor.map((segment) => segment.label)).toEqual([
      "Q1",
      "Q2",
      "Q3",
      "Q4",
    ]);
    expect(buildGanttHeader(day("2026-01-01"), day("2027-12-31"), "year").minor.map((segment) => segment.label)).toEqual([
      "H1",
      "H2",
      "H1",
      "H2",
    ]);
    const days = buildGanttHeader(day("2026-10-10"), day("2026-10-12"), "day").minor;
    expect(days.map((segment) => [segment.label, segment.is_weekend])).toEqual([
      ["Sat 10", true],
      ["Sun 11", true],
      ["Mon 12", false],
    ]);
  });
});

describe("gantt range", () => {
  test("pads the items, starts on a whole week and stretches to the visible width", () => {
    vi.useFakeTimers();
    vi.setSystemTime(day("2025-06-15"));
    const range = resolveGanttRange([day("2025-06-04"), day("2025-06-30")], "week", 200);
    expect(range.start.getDay()).toBe(0);
    expect(range.start <= day("2025-05-07")).toBe(true);
    expect(Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1).toBeGreaterThanOrEqual(200);
  });
});

describe("gantt labels", () => {
  test("formats ranges like the group summary and the item list", () => {
    expect(formatGanttRange(day("2025-06-05"), day("2025-06-30"))).toBe("Jun 5, '25 - Jun 30, '25");
    expect(formatGanttRange(day("2025-06-05"), day("2025-06-05"))).toBe("Jun 5, '25");
    expect(formatGanttDuration(day("2025-06-05"), day("2025-06-30"))).toBe("26 days");
    expect(formatGanttDuration(day("2025-06-04"), day("2025-06-04"))).toBe("1 day");
    expect(formatGanttRangeCompact(day("2025-06-05"), day("2025-06-12"))).toBe("Jun 5 - 12, '25");
    expect(formatGanttRangeCompact(day("2025-06-28"), day("2025-07-03"))).toBe("Jun 28 - Jul 3, '25");
    expect(formatGanttRangeCompact(day("2025-12-28"), day("2026-01-04"))).toBe("Dec 28, '25 - Jan 4, '26");
  });
});

describe("critical path", () => {
  test("walks back from the latest end through the predecessors that finish last", () => {
    const path = computeCriticalPath([
      { id: "design", end: day("2026-01-05"), predecessor_ids: [] },
      { id: "copy", end: day("2026-01-03"), predecessor_ids: [] },
      { id: "build", end: day("2026-01-12"), predecessor_ids: ["design", "copy"] },
      { id: "launch", end: day("2026-01-15"), predecessor_ids: ["build"] },
      { id: "side", end: day("2026-01-08"), predecessor_ids: [] },
    ]);
    expect([...path.item_ids].sort()).toEqual(["build", "design", "launch"]);
    expect([...path.link_keys].sort()).toEqual(["build->launch", "design->build"]);
  });

  test("is empty without items", () => {
    expect(computeCriticalPath([]).item_ids.size).toBe(0);
  });
});
