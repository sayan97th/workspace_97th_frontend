import { describe, expect, test } from "vitest";
import { bucketFor, bucketMyWork, groupMyWork, newItemDateFor, sortMyWorkItems, type MyWorkSort } from "@/components/my-work/myWorkBuckets";
import type { MyWorkItemDto } from "@/types/personal";

// Wednesday, October 7 2026. Its week runs Monday Oct 5 to Sunday Oct 11.
const TODAY = new Date(2026, 9, 7);
const BY_DATE: MyWorkSort = { key: "date", direction: "asc" };

const makeItem = (id: number, date: string | null, overrides: Partial<MyWorkItemDto> = {}): MyWorkItemDto => ({
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
  date_column: date ? { id: 9, type: "date", label: "Date" } : null,
  date: date ? { value: date, start: null } : null,
  is_done: false,
  can_edit: true,
  updated_at: null,
  ...overrides,
});

describe("bucketFor", () => {
  test.each([
    ["2026-10-06", "past_dates"],
    ["2026-10-07", "today"],
    ["2026-10-08", "this_week"],
    ["2026-10-11", "this_week"],
    ["2026-10-12", "next_week"],
    ["2026-10-18", "next_week"],
    ["2026-10-19", "later"],
  ])("a due date of %s lands in %s", (date, bucket) => {
    expect(bucketFor(makeItem(1, date), TODAY)).toBe(bucket);
  });

  test("an item without a date gets its own section and a done item stays in its date section", () => {
    expect(bucketFor(makeItem(1, null), TODAY)).toBe("no_date");
    expect(bucketFor(makeItem(2, "2026-10-01", { is_done: true }), TODAY)).toBe("past_dates");
  });

  test("on a Sunday the next day already belongs to next week", () => {
    const sunday = new Date(2026, 9, 11);
    expect(bucketFor(makeItem(1, "2026-10-12"), sunday)).toBe("next_week");
  });
});

describe("bucketMyWork", () => {
  test("always returns every date section in display order and sorts by date", () => {
    const buckets = bucketMyWork([makeItem(1, "2026-10-09"), makeItem(2, null), makeItem(3, "2026-10-01"), makeItem(4, "2026-10-08")], TODAY, BY_DATE);
    expect(buckets.map((bucket) => bucket.key)).toEqual(["past_dates", "today", "this_week", "next_week", "later", "no_date"]);
    expect(buckets.map((bucket) => bucket.items.length)).toEqual([1, 0, 2, 0, 0, 1]);
    expect(buckets[2].items.map((item) => item.id)).toEqual([4, 1]);
  });

  test("gives each section the date a new item needs to land in it", () => {
    expect(bucketMyWork([], TODAY, BY_DATE).map((bucket) => bucket.new_item_date)).toEqual([
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-12",
      "2026-10-19",
      null,
    ]);
    expect(newItemDateFor("this_week", new Date(2026, 9, 11))).toBe("2026-10-11");
  });
});

describe("sortMyWorkItems", () => {
  test("sorts by a column in both directions and keeps empty values last", () => {
    const items = [
      makeItem(1, "2026-10-09", { priority: { id: "b", label: "Low", color: "#579bfc" } }),
      makeItem(2, "2026-10-08"),
      makeItem(3, "2026-10-10", { priority: { id: "a", label: "High", color: "#e2445c" } }),
    ];
    expect(sortMyWorkItems(items, { key: "priority", direction: "asc" }).map((item) => item.id)).toEqual([3, 1, 2]);
    expect(sortMyWorkItems(items, { key: "priority", direction: "desc" }).map((item) => item.id)).toEqual([1, 3, 2]);
    expect(sortMyWorkItems(items, { key: "date", direction: "desc" }).map((item) => item.id)).toEqual([3, 1, 2]);
  });
});

describe("groupMyWork", () => {
  test("board view makes one section per board, preselecting that board for new items", () => {
    const items = [makeItem(1, null, { board: { id: 7, label: "Sprints", workspace: null } }), makeItem(2, null)];
    const sections = groupMyWork(items, "board", TODAY, BY_DATE);
    expect(sections.map((section) => section.label)).toEqual(["Board", "Sprints"]);
    expect(sections[1].new_item_board_id).toBe(7);
  });

  test("status view puts items without a status last", () => {
    const items = [makeItem(1, null), makeItem(2, null, { status: { id: "done", label: "Done", color: "#00c875" } })];
    expect(groupMyWork(items, "status", TODAY, BY_DATE).map((section) => section.label)).toEqual(["Done", "No status"]);
  });
});
