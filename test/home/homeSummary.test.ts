import { describe, expect, it } from "vitest";
import { buildDayRecap, buildWorkSummary, firstBusyTab, greetingFor, relativeTime } from "@/components/home/homeSummary";
import type { MyWorkItemDto } from "@/types/personal";

const makeItem = (id: number, date: string | null, is_done = false): MyWorkItemDto => ({
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
  date_column: null,
  date: date ? { value: date, start: null } : null,
  is_done,
  can_edit: true,
  updated_at: null,
});

// Wednesday, Oct 14 2026, local time.
const today = new Date(2026, 9, 14, 10, 0, 0);

describe("buildWorkSummary", () => {
  it("splits open items into overdue, today and this week, soonest first", () => {
    const summary = buildWorkSummary(
      [
        makeItem(1, "2026-10-16"),
        makeItem(2, "2026-10-14"),
        makeItem(3, "2026-10-01"),
        makeItem(4, "2026-10-15"),
        makeItem(5, "2026-10-14", true),
        makeItem(6, "2026-10-30"),
        makeItem(7, null),
      ],
      today
    );

    expect(summary.past_dates.map((item) => item.id)).toEqual([3]);
    expect(summary.today.map((item) => item.id)).toEqual([2]);
    expect(summary.this_week.map((item) => item.id)).toEqual([4, 1]);
  });

  it("opens on the first tab that has items", () => {
    expect(firstBusyTab(buildWorkSummary([makeItem(1, "2026-10-16")], today))).toBe("this_week");
    expect(firstBusyTab(buildWorkSummary([], today))).toBe("today");
  });
});

describe("buildDayRecap", () => {
  it("lists only the counts that are not zero", () => {
    expect(buildDayRecap({ overdue: 2, today: 1, unread: 3 })).toBe(
      "You have 2 overdue items, 1 item due today and 3 unread notifications."
    );
    expect(buildDayRecap({ overdue: 0, today: 0, unread: 1 })).toBe("You have 1 unread notification.");
  });

  it("celebrates an empty day", () => {
    expect(buildDayRecap({ overdue: 0, today: 0, unread: 0 })).toContain("all caught up");
  });
});

describe("greetingFor and relativeTime", () => {
  it("greets by the time of day", () => {
    expect(greetingFor(new Date(2026, 9, 14, 9))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 9, 14, 14))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 9, 14, 20))).toBe("Good evening");
  });

  it("formats recent times compactly", () => {
    expect(relativeTime(new Date(2026, 9, 14, 9, 59, 30).toISOString(), today)).toBe("just now");
    expect(relativeTime(new Date(2026, 9, 14, 7, 0).toISOString(), today)).toBe("3h ago");
    expect(relativeTime(new Date(2026, 9, 12, 10, 0).toISOString(), today)).toBe("2d ago");
  });
});
