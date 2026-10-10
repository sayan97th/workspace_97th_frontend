import { describe, expect, test } from "vitest";
import { buildCalendarEvents, buildCalendarRows, calendarTitleOf, layoutRowSegments, shiftCalendarCursor } from "@/components/my-work/myWorkCalendar";
import type { MyWorkItemDto } from "@/types/personal";

const makeItem = (id: number, end: string, start: string | null = null, label = "Due date"): MyWorkItemDto => ({
  id,
  name: `Item ${id}`,
  parent: null,
  board: { id: 1, label: "Board", workspace: null },
  group: { id: 1, name: "Group", color: "#579bfc" },
  status_column_id: null,
  status: null,
  priority_column_id: null,
  priority: null,
  people: [],
  updates_count: 0,
  date_column: { id: 9, type: start ? "timeline" : "date", label },
  date: { value: end, start },
  is_done: false,
  can_edit: true,
  updated_at: null,
});

describe("buildCalendarRows", () => {
  test("a month shows every week it touches, starting on Sunday", () => {
    const rows = buildCalendarRows(new Date(2026, 9, 9), "month", "2026-10-09");
    expect(rows).toHaveLength(5);
    expect(rows[0][0].key).toBe("2026-09-27");
    expect(rows[0][0].in_month).toBe(false);
    expect(rows[4][6].key).toBe("2026-10-31");
    expect(rows.flat().find((day) => day.is_today)?.key).toBe("2026-10-09");
  });

  test("week and day show the cursor's week and the cursor's day", () => {
    expect(buildCalendarRows(new Date(2026, 9, 9), "week", "2026-10-09")[0].map((day) => day.key)).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
    expect(buildCalendarRows(new Date(2026, 9, 9), "day", "2026-10-09")[0].map((day) => day.key)).toEqual(["2026-10-09"]);
  });
});

describe("layoutRowSegments", () => {
  test("a timeline spans its days and overlapping items stack on separate lanes", () => {
    const { events } = buildCalendarEvents([makeItem(1, "2026-10-07", "2026-10-05", "Timeline"), makeItem(2, "2026-10-06")]);
    const [week] = buildCalendarRows(new Date(2026, 9, 5), "week", "2026-10-09");
    const segments = layoutRowSegments(week, events);

    expect(segments.map(({ event, first_column, span, lane }) => [event.item.id, first_column, span, lane])).toEqual([
      [1, 1, 3, 0],
      [2, 2, 1, 1],
    ]);
  });

  test("an item running past the row keeps going on the next row", () => {
    const { events } = buildCalendarEvents([makeItem(1, "2026-10-13", "2026-10-09", "Timeline")]);
    const rows = buildCalendarRows(new Date(2026, 9, 1), "month", "2026-10-09");
    const [first] = layoutRowSegments(rows[1], events);
    const [second] = layoutRowSegments(rows[2], events);

    expect(first).toMatchObject({ first_column: 5, span: 2, continues_before: false, continues_after: true });
    expect(second).toMatchObject({ first_column: 0, span: 3, continues_before: true, continues_after: false });
  });
});

describe("buildCalendarEvents", () => {
  test("sources are the date column labels, sorted, each with its own color", () => {
    const { sources } = buildCalendarEvents([makeItem(1, "2026-10-07", "2026-10-05", "Timeline"), makeItem(2, "2026-10-06"), makeItem(3, "2026-10-08")]);
    expect(sources.map((source) => source.label)).toEqual(["Due date", "Timeline"]);
    expect(new Set(sources.map((source) => source.color)).size).toBe(2);
  });
});

describe("calendar navigation", () => {
  test("titles read like monday.com", () => {
    expect(calendarTitleOf(new Date(2026, 9, 9), "month")).toBe("October 2026");
    expect(calendarTitleOf(new Date(2026, 9, 9), "day")).toBe("Oct 9th, 2026");
    expect(calendarTitleOf(new Date(2026, 9, 22), "day")).toBe("Oct 22nd, 2026");
    expect(calendarTitleOf(new Date(2026, 9, 11), "day")).toBe("Oct 11th, 2026");
  });

  test("previous and next move by the mode's period", () => {
    const cursor = new Date(2026, 9, 31);
    expect(shiftCalendarCursor(cursor, "month", 1)).toEqual(new Date(2026, 10, 1));
    expect(shiftCalendarCursor(cursor, "week", -1)).toEqual(new Date(2026, 9, 24));
    expect(shiftCalendarCursor(cursor, "day", 1)).toEqual(new Date(2026, 10, 1));
  });
});
