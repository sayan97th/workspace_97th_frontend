import { describe, expect, it } from "vitest";
import {
  buildDayRecap,
  buildWorkSummary,
  filterByHorizon,
  firstBusyTab,
  formatDueIn,
  formatRangeStart,
  greetingFor,
  groupUpcoming,
  relativeTime,
  workRangeOf,
} from "@/components/home/homeSummary";
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
  timeline: null,
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
    expect(summary.upcoming.map((item) => item.id)).toEqual([6]);
  });

  it("opens on the first tab that has items", () => {
    expect(firstBusyTab(buildWorkSummary([makeItem(1, "2026-10-16")], today))).toBe("this_week");
    expect(firstBusyTab(buildWorkSummary([], today))).toBe("today");
    expect(firstBusyTab(buildWorkSummary([makeItem(1, "2026-11-20")], today))).toBe("upcoming");
    expect(firstBusyTab(buildWorkSummary([makeItem(1, "2026-11-20"), makeItem(2, "2026-10-15")], today))).toBe("this_week");
  });
});

describe("Upcoming", () => {
  const upcoming = buildWorkSummary(
    [makeItem(1, "2026-10-19"), makeItem(2, "2026-10-28"), makeItem(3, "2026-11-12"), makeItem(4, "2027-01-08"), makeItem(5, "2026-10-25")],
    today
  ).upcoming;

  it("groups by next week, the rest of this month and then by month", () => {
    const groups = groupUpcoming(upcoming, today);
    expect(groups.map((group) => group.key)).toEqual(["next_week", "2026-10", "2026-11", "2027-01"]);
    expect(groups[0].items.map((item) => item.id)).toEqual([1, 5]);
    expect(groups[0].hint).toContain("to");
    expect(groups[1].label).toMatch(/^Later in /);
    expect(groups[3].label).toContain("2027");
  });

  it("keeps only what is due within the horizon", () => {
    expect(filterByHorizon(upcoming, "two_weeks", today).map((item) => item.id)).toEqual([1, 5, 2]);
    expect(filterByHorizon(upcoming, "month", today).map((item) => item.id)).toEqual([1, 5, 2, 3]);
    expect(filterByHorizon(upcoming, "all", today)).toHaveLength(5);
  });

  it("says how far away a due date is", () => {
    expect(formatDueIn("2026-10-15", today)).toBe("tomorrow");
    expect(formatDueIn("2026-10-23", today)).toBe("in 9 days");
    expect(formatDueIn("2026-11-11", today)).toBe("in 4 weeks");
    expect(formatDueIn("2027-01-14", today)).toBe("in 3 months");
  });
});

describe("workRangeOf", () => {
  it("reads the start from the due date timeline or the separate timeline", () => {
    const from_date = { ...makeItem(1, "2026-10-24"), date: { value: "2026-10-24", start: "2026-10-04" } };
    expect(workRangeOf(from_date, today)).toMatchObject({ start: "2026-10-04", end: "2026-10-24", phase: "in_progress", progress: 0.5 });

    const from_timeline = { ...makeItem(2, "2026-11-30"), timeline: { start: "2026-11-02", end: "2026-11-30" } };
    const range = workRangeOf(from_timeline, today);
    expect(range).toMatchObject({ phase: "not_started", progress: 0 });
    expect(formatRangeStart(range!, today)).toBe("Starts Nov 2");
  });

  it("ignores items without a start before the due date", () => {
    expect(workRangeOf(makeItem(1, "2026-10-24"), today)).toBeNull();
    expect(workRangeOf({ ...makeItem(2, "2026-10-24"), timeline: { start: "2026-10-30", end: "2026-11-02" } }, today)).toBeNull();
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
