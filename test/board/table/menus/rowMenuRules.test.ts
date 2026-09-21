import { describe, expect, test } from "vitest";
import { getConvertBlockedReason, getConvertDisabledReason } from "@/components/board/table/menus/rowMenuRules";

describe("getConvertDisabledReason", () => {
  test("a subitem can always be converted to an item", () => {
    expect(getConvertDisabledReason({ is_sub: true, target_count: 0 })).toBeUndefined();
    expect(getConvertDisabledReason({ is_sub: true, blocked_reason: "ignored", target_count: 0 })).toBeUndefined();
  });

  test("an item with a blocking reason is disabled with that reason", () => {
    expect(getConvertDisabledReason({ is_sub: false, blocked_reason: "Move or delete its subitems first", target_count: 3 })).toBe("Move or delete its subitems first");
  });

  test("an item with no other item to hang under is disabled", () => {
    expect(getConvertDisabledReason({ is_sub: false, target_count: 0 })).toBe("There is no other item to convert this into");
  });

  test("an item with targets and no blocker is enabled", () => {
    expect(getConvertDisabledReason({ is_sub: false, target_count: 1 })).toBeUndefined();
  });
});

describe("getConvertBlockedReason", () => {
  test("blocks an item that already has subitems, because the board nests only two levels", () => {
    expect(getConvertBlockedReason(1)).toBe("Move or delete its subitems first");
    expect(getConvertBlockedReason(5)).toBe("Move or delete its subitems first");
  });

  test("does not block an item without subitems", () => {
    expect(getConvertBlockedReason(0)).toBeUndefined();
  });
});
