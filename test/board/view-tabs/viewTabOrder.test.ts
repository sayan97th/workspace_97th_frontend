import { describe, expect, it } from "vitest";
import {
  computeVisibleTabIds,
  mergeReorderedIds,
  moveId,
  sortBoardViews,
} from "@/components/board/view-tabs/viewTabOrder";

const view = (id: number, overrides: Partial<{ position: number; pinned: boolean; is_primary: boolean }> = {}) => ({
  id,
  position: id,
  pinned: false,
  is_primary: false,
  ...overrides,
});

describe("sortBoardViews", () => {
  it("puts the primary tab first, then pinned tabs, then the rest by position", () => {
    const views = [view(3), view(2, { pinned: true }), view(1, { is_primary: true, position: 9 }), view(4)];
    expect(sortBoardViews(views, null).map((v) => v.id)).toEqual([1, 2, 3, 4]);
  });

  it("lets a personal order move the primary tab and appends views missing from it", () => {
    const views = [view(1, { is_primary: true }), view(2), view(3), view(4)];
    expect(sortBoardViews(views, [3, 1, 2]).map((v) => v.id)).toEqual([3, 1, 2, 4]);
  });

  it("treats an empty personal order like no order", () => {
    const views = [view(2), view(1, { is_primary: true })];
    expect(sortBoardViews(views, []).map((v) => v.id)).toEqual([1, 2]);
  });
});

describe("mergeReorderedIds", () => {
  it("keeps tabs that are not on screen in their slots", () => {
    // 3 is hidden and 5 overflowed, the viewer dragged 4 in front of 1.
    expect(mergeReorderedIds([1, 2, 3, 4, 5], [4, 1, 2])).toEqual([4, 1, 3, 2, 5]);
  });

  it("returns the same order when nothing moved", () => {
    expect(mergeReorderedIds([1, 2, 3], [1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe("moveId", () => {
  it("moves an id and clamps the target index", () => {
    expect(moveId([1, 2, 3], 1, 2)).toEqual([2, 3, 1]);
    expect(moveId([1, 2, 3], 3, -4)).toEqual([3, 1, 2]);
    expect(moveId([1, 2, 3], 1, 99)).toEqual([2, 3, 1]);
  });
});

describe("computeVisibleTabIds", () => {
  const widths = { "1": 100, "2": 100, "3": 100, "4": 100 };
  const base = { ids: [1, 2, 3, 4], widths, more_button_width: 60, gap: 0, active_id: 1 };

  it("shows every tab when they all fit", () => {
    expect(computeVisibleTabIds({ ...base, available_width: 400 })).toEqual([1, 2, 3, 4]);
  });

  it("keeps the leading tabs that fit next to the More button", () => {
    expect(computeVisibleTabIds({ ...base, available_width: 300 })).toEqual([1, 2]);
  });

  it("swaps an overflowing active tab into the last slot", () => {
    expect(computeVisibleTabIds({ ...base, available_width: 300, active_id: 4 })).toEqual([1, 4]);
  });

  it("shows everything until every tab has been measured", () => {
    expect(computeVisibleTabIds({ ...base, widths: { "1": 100 }, available_width: 50 })).toEqual([1, 2, 3, 4]);
  });

  it("always keeps the active tab on screen, even when nothing fits", () => {
    expect(computeVisibleTabIds({ ...base, available_width: 90, active_id: 3 })).toEqual([3]);
  });
});
