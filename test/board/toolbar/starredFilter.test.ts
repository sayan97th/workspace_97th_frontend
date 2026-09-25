import { describe, expect, test } from "vitest";
import {
  BOARD_FILTER_CHECKED_OPTION_ID,
  BOARD_FILTER_STARRED_FIELD_ID,
  BOARD_FILTER_UNCHECKED_OPTION_ID,
  buildAdvancedFilterMatcher,
  buildQuickFilterFacets,
  buildRulesFromQuickFacet,
} from "@/components/board/toolbar/filterEngine";
import type { BoardFilterContext } from "@/components/board/toolbar/types";
import { buildBoardFilterFields } from "@/components/workspace-nav/boardToolbarFields";
import type { BoardItemDto } from "@/types/board-content";

const CONTEXT: BoardFilterContext = { today: "2026-09-25", current_person_id: null };

const buildItem = (id: number, name: string, is_priority: boolean) =>
  ({ id, name, group_id: 1, parent_id: null, is_priority, values: {}, children: [] }) as unknown as BoardItemDto;

const ROWS = [buildItem(1, "Urgent", true), buildItem(2, "Backlog", false), buildItem(3, "Launch", true)];

const FIELDS = buildBoardFilterFields({
  item_columns: [],
  groups: [],
  tags: [],
  persons: [],
  people_names_by_id: {},
  item_column_id: "name",
  item_column_label: "Item",
  getColumnText: (row) => row.name,
});

const starred_field = FIELDS.find((field) => field.id === BOARD_FILTER_STARRED_FIELD_ID)!;

describe("starred filter", () => {
  test("every board describes a Starred item detail field", () => {
    expect(starred_field).toMatchObject({ label: "Starred", kind: "checkbox", section: "Item details" });
  });

  test("the Starred facet splits rows by their star and uses its own labels", () => {
    const facet = buildQuickFilterFacets(FIELDS, []).find((candidate) => candidate.id === BOARD_FILTER_STARRED_FIELD_ID)!;
    expect(facet.options.map((option) => option.label)).toEqual(["Starred", "Not starred"]);
    const starred_ids = ROWS.filter((row) => facet.getOptionIds(row, CONTEXT).includes(BOARD_FILTER_CHECKED_OPTION_ID)).map((row) => row.id);
    expect(starred_ids).toEqual([1, 3]);
    expect(facet.getOptionIds(ROWS[1], CONTEXT)).toEqual([BOARD_FILTER_UNCHECKED_OPTION_ID]);
  });

  test("converting the Starred pick to Advanced keeps the same rows", () => {
    const rules = buildRulesFromQuickFacet(starred_field, [BOARD_FILTER_CHECKED_OPTION_ID], []).rules.map((draft, index) => ({ ...draft, id: `r${index}` }));
    expect(rules).toEqual([expect.objectContaining({ column_id: BOARD_FILTER_STARRED_FIELD_ID, condition: "is_checked" })]);
    const matcher = buildAdvancedFilterMatcher({ rules, groups: [], operator: "and" }, new Map(FIELDS.map((field) => [field.id, field])), CONTEXT)!;
    expect(ROWS.filter((row) => matcher(row, null)).map((row) => row.id)).toEqual([1, 3]);
  });
});
