import { describe, expect, test } from "vitest";
import { applyRowToggle, collectSelection, keepLevel, toggleSubitemsOf } from "@/components/board/table/selectionUtils";
import type { BoardTableGroup, BoardTableItem } from "@/components/board/table/types";

const node = (id: string) => ({ id, name: id, values: {} });
const item = (id: string, sub_ids: string[] = []): BoardTableItem => ({ ...node(id), subs: sub_ids.map(node) }) as BoardTableItem;

const groups = [
  { key: "g1", items: [item("i1", ["s1", "s2", "s3"]), item("i2", ["s4"]), item("i3")] },
  { key: "g2", items: [item("i4")] },
] as unknown as BoardTableGroup[];

describe("table row selection", () => {
  test("checking a row toggles it", () => {
    const checked = applyRowToggle(groups, {}, "i1", null, false);
    expect(checked).toEqual({ i1: true });
    expect(applyRowToggle(groups, checked, "i1", "i1", false)).toEqual({});
  });

  test("checking a subitem clears checked items, so the bar shows subitem actions", () => {
    const checked = applyRowToggle(groups, { i1: true, i2: true }, "s1", "i2", false);
    expect(checked).toEqual({ s1: true });
  });

  test("checking an item clears checked subitems", () => {
    expect(applyRowToggle(groups, { s1: true, s4: true }, "i3", "s4", false)).toEqual({ i3: true });
  });

  test("shift click checks the range between the last clicked row and this one", () => {
    expect(applyRowToggle(groups, { s1: true }, "s3", "s1", true)).toEqual({ s1: true, s2: true, s3: true });
    expect(applyRowToggle(groups, { i3: true }, "i1", "i3", true)).toEqual({ i1: true, i2: true, i3: true });
  });

  test("shift click outside the anchor's list falls back to a single toggle", () => {
    expect(applyRowToggle(groups, { s1: true }, "s4", "s1", true)).toEqual({ s1: true, s4: true });
    expect(applyRowToggle(groups, { i1: true }, "i4", "i1", true)).toEqual({ i1: true, i4: true });
  });

  test("subitems of different parents can be checked together", () => {
    const checked = applyRowToggle(groups, applyRowToggle(groups, {}, "s2", null, false), "s4", "s2", false);
    expect(collectSelection(groups, checked)).toEqual({ item_ids: [], subitem_ids: ["s2", "s4"] });
  });

  test("the subitem header checkbox checks every subitem of the item, then clears them", () => {
    const checked = toggleSubitemsOf(groups, { i2: true, s4: true }, "i1");
    expect(checked).toEqual({ s1: true, s2: true, s3: true, s4: true });
    expect(toggleSubitemsOf(groups, checked, "i1")).toEqual({ s4: true });
  });

  test("keepLevel drops the other level", () => {
    expect(keepLevel(groups, { i1: true, s1: true, s2: false }, "item")).toEqual({ i1: true });
    expect(keepLevel(groups, { i1: true, s1: true }, "subitem")).toEqual({ s1: true });
  });
});
