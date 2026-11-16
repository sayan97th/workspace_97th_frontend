import { describe, expect, test } from "vitest";
import {
  bulkTargetIds,
  diffListValue,
  isBulkEditableKind,
  isMergeEdit,
  mergeListValue,
} from "@/components/board/table/bulkCellEdit";

describe("bulk cell edit", () => {
  test("only an edit on a checked row with other checked rows spreads", () => {
    expect(bulkTargetIds(1, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(bulkTargetIds(4, [1, 2, 3])).toBeNull();
    expect(bulkTargetIds(1, [1])).toBeNull();
    expect(bulkTargetIds(1, [])).toBeNull();
  });

  test("rows the viewer cannot edit are left out, the edited row always stays", () => {
    expect(bulkTargetIds(1, [1, 2, 3], (id) => id === 3)).toEqual([1, 3]);
    expect(bulkTargetIds(1, [1, 2], () => false)).toBeNull();
  });

  test("read only, per person and per row history columns never spread", () => {
    for (const kind of ["people", "status", "date", "text", "dropdown", "tags", "checkbox", "timeline"] as const) {
      expect(isBulkEditableKind(kind)).toBe(true);
    }
    for (const kind of ["files", "vote", "formula", "mirror", "dependency", "button", "checklist", "time_tracking", "auto_number"] as const) {
      expect(isBulkEditableKind(kind)).toBe(false);
    }
    expect(isBulkEditableKind(undefined)).toBe(false);
  });

  test("people merge entries, a single select dropdown copies its value", () => {
    expect(isMergeEdit("people", null, ["1"])).toBe(true);
    expect(isMergeEdit("dropdown", ["a"], ["a", "b"])).toBe(true);
    expect(isMergeEdit("dropdown", "a", "b")).toBe(false);
    expect(isMergeEdit("status", null, "done")).toBe(false);
  });

  test("the diff compares ids as strings", () => {
    expect(diffListValue([1, "2"], ["1", "3"])).toEqual({ added: ["3"], removed: ["2"] });
    expect(diffListValue(null, ["5"])).toEqual({ added: ["5"], removed: [] });
    expect(diffListValue(["5"], null)).toEqual({ added: [], removed: ["5"] });
  });

  test("adding a person keeps who each row already had", () => {
    expect(mergeListValue(["7"], ["9"], [])).toEqual(["7", "9"]);
    expect(mergeListValue(null, ["9"], [])).toEqual(["9"]);
    expect(mergeListValue([9], ["9"], [])).toEqual([9]);
  });

  test("removing the last person empties the cell", () => {
    expect(mergeListValue(["7", "9"], [], ["9"])).toEqual(["7"]);
    expect(mergeListValue(["9"], [], [9])).toBeNull();
  });
});
