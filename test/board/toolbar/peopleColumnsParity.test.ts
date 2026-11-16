import { describe, expect, test } from "vitest";
import { buildBoardFilterFields } from "@/components/workspace-nav/boardToolbarFields";
import { getNoAccessTitle, hasNoBoardAccess } from "@/lib/assignable-person";
import type { BoardColumnDto, BoardItemDto } from "@/types/board-content";

// People, Reporter and Creation log columns pick from the same people: the ones added to the board.

const creation_log = { id: 7, label: "Creation log", type: "creation_log", config: {} } as unknown as BoardColumnDto;
const reporter = { id: 8, label: "Reporter", type: "people", config: { auto_assign_creator: true } } as unknown as BoardColumnDto;

const FIELDS = buildBoardFilterFields({
  item_columns: [creation_log, reporter],
  groups: [],
  tags: [],
  persons: [{ id: "1", name: "Amanda McKay", initials: "AM", avatar_seed: 0 }],
  people_names_by_id: {},
  item_column_id: "name",
  item_column_label: "Item",
  getColumnText: (row) => row.name,
});

const row = { id: 1, name: "Task", group_id: 1, created_by_id: 1, values: { "8": ["1"] }, children: [] } as unknown as BoardItemDto;

describe("People, Reporter and Creation log parity", () => {
  test("Creation log filters by person with the same board member options as Reporter", () => {
    const log_field = FIELDS.find((field) => field.id === "7")!;
    const reporter_field = FIELDS.find((field) => field.id === "8")!;

    expect(log_field.kind).toBe("people");
    expect(log_field.options).toEqual(reporter_field.options);
    expect(log_field.getOptionIds!(row)).toEqual(["1"]);
    expect(reporter_field.getOptionIds!(row)).toEqual(["1"]);
  });

  test("only someone outside a private board is flagged as having no access", () => {
    const outsider = { is_outside_board: true };

    expect(hasNoBoardAccess(outsider, true)).toBe(true);
    expect(hasNoBoardAccess(outsider, false)).toBe(false);
    expect(hasNoBoardAccess({ is_outside_board: true, is_deactivated: true }, true)).toBe(false);
    expect(hasNoBoardAccess(undefined, true)).toBe(false);
    expect(getNoAccessTitle("Britni")).toBe("Britni has no access to this private board and is not notified");
  });
});
