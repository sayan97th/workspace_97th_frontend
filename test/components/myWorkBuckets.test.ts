import { describe, expect, test } from "vitest";
import { bucketFor, bucketMyWork } from "@/components/my-work/myWorkBuckets";
import type { MyWorkItemDto } from "@/types/personal";

// Wednesday, October 7 2026. Its week runs Monday Oct 5 to Sunday Oct 11.
const TODAY = new Date(2026, 9, 7);

const makeItem = (id: number, date: string | null, overrides: Partial<MyWorkItemDto> = {}): MyWorkItemDto => ({
  id,
  name: `Item ${id}`,
  parent: null,
  board: { id: 1, label: "Board", workspace: null },
  group: { id: 1, name: "Group", color: "#579bfc" },
  status_column_id: null,
  status: null,
  date_column: date ? { id: 9, type: "date" } : null,
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

  test("an item without a date and a done item get their own sections", () => {
    expect(bucketFor(makeItem(1, null), TODAY)).toBe("no_date");
    expect(bucketFor(makeItem(2, "2026-10-01", { is_done: true }), TODAY)).toBe("done");
  });

  test("on a Sunday the next day already belongs to next week", () => {
    const sunday = new Date(2026, 9, 11);
    expect(bucketFor(makeItem(1, "2026-10-12"), sunday)).toBe("next_week");
  });
});

describe("bucketMyWork", () => {
  test("keeps the display order, drops empty sections and sorts by date", () => {
    const buckets = bucketMyWork(
      [makeItem(1, "2026-10-09"), makeItem(2, null), makeItem(3, "2026-10-01"), makeItem(4, "2026-10-08")],
      TODAY,
      { include_done: false }
    );
    expect(buckets.map((bucket) => bucket.key)).toEqual(["past_dates", "this_week", "no_date"]);
    expect(buckets[1].items.map((item) => item.id)).toEqual([4, 1]);
  });

  test("hides done items unless asked for them", () => {
    const items = [makeItem(1, "2026-10-08", { is_done: true })];
    expect(bucketMyWork(items, TODAY, { include_done: false })).toEqual([]);
    expect(bucketMyWork(items, TODAY, { include_done: true }).map((bucket) => bucket.key)).toEqual(["done"]);
  });
});
