import { describe, expect, test } from "vitest";
import { buildRowMatcher, deriveBoardRows, type BoardDerivationState } from "@/components/board/toolbar/deriveBoardRows";
import {
  buildAdvancedFilterMatcher,
  buildQuickFilterFacets,
  buildRuleFromRowValue,
  buildRulesFromQuickFacet,
  describeFilterRule,
  evaluateFilterRule,
  isRuleComplete,
  resolveDateValue,
} from "@/components/board/toolbar/filterEngine";
import type {
  BoardAdvancedFilterRow,
  BoardFilterContext,
  BoardFilterField,
  BoardToolbarConfig,
} from "@/components/board/toolbar/types";

type Row = {
  id: string;
  name: string;
  status: string | null;
  owners: string[];
  budget: number | null;
  due: string | null;
  done: boolean;
};

// Thursday, September 24 2026. Its week runs Monday Sep 21 to Sunday Sep 27.
const CONTEXT: BoardFilterContext = { today: "2026-09-24", current_person_id: "7" };

const FIELDS: BoardFilterField<Row>[] = [
  { id: "name", label: "Name", kind: "text", getText: (row) => row.name },
  {
    id: "status",
    label: "Status",
    kind: "option",
    options: [
      { id: "done", label: "Done" },
      { id: "stuck", label: "Stuck" },
    ],
    getText: (row) => row.status ?? "",
    getOptionIds: (row) => (row.status ? [row.status] : []),
  },
  { id: "owners", label: "Owner", kind: "people", getText: () => "", getOptionIds: (row) => row.owners },
  { id: "budget", label: "Budget", kind: "number", getText: (row) => String(row.budget ?? ""), getNumber: (row) => row.budget },
  {
    id: "due",
    label: "Due",
    kind: "date",
    getText: (row) => row.due ?? "",
    getDateRange: (row) => (row.due ? { start: row.due, end: row.due } : null),
  },
  { id: "done", label: "Done", kind: "checkbox", getText: () => "", getChecked: (row) => row.done },
];
const FIELDS_BY_ID = new Map(FIELDS.map((field) => [field.id, field]));

const ROWS: Row[] = [
  { id: "a", name: "Alpha", status: "done", owners: ["7"], budget: 5, due: "2026-09-27", done: true },
  { id: "b", name: "Beta", status: "stuck", owners: ["8"], budget: 120, due: "2026-09-20", done: false },
  { id: "c", name: "Gamma", status: null, owners: [], budget: null, due: null, done: false },
];

const rule = (patch: Partial<BoardAdvancedFilterRow>): BoardAdvancedFilterRow => ({
  id: "r",
  column_id: null,
  condition: null,
  value: "",
  values: [],
  ...patch,
});

const matchingIds = (rules: BoardAdvancedFilterRow[], operator: "and" | "or" = "and") => {
  const matcher = buildAdvancedFilterMatcher({ rules, groups: [], operator }, FIELDS_BY_ID, CONTEXT);
  return ROWS.filter((row) => !matcher || matcher(row, null)).map((row) => row.id);
};

describe("filter rules per field kind", () => {
  test("option rules match picked ids, and is not keeps blanks", () => {
    expect(matchingIds([rule({ column_id: "status", condition: "is", values: ["done"] })])).toEqual(["a"]);
    expect(matchingIds([rule({ column_id: "status", condition: "is_not", values: ["done"] })])).toEqual(["b", "c"]);
    expect(matchingIds([rule({ column_id: "status", condition: "is_empty" })])).toEqual(["c"]);
  });

  test("people rules resolve Me to the current person", () => {
    expect(matchingIds([rule({ column_id: "owners", condition: "is", values: ["__me__"] })])).toEqual(["a"]);
  });

  test("number rules compare numerically and between accepts reversed bounds", () => {
    expect(matchingIds([rule({ column_id: "budget", condition: "greater_than", value: "10" })])).toEqual(["b"]);
    expect(matchingIds([rule({ column_id: "budget", condition: "between", values: ["9", "1"] })])).toEqual(["a"]);
    expect(matchingIds([rule({ column_id: "budget", condition: "not_equals", value: "5" })])).toEqual(["b", "c"]);
  });

  test("date rules use relative presets with Monday week starts", () => {
    expect(resolveDateValue("this_week", CONTEXT.today)).toEqual({ start: "2026-09-21", end: "2026-09-27" });
    expect(matchingIds([rule({ column_id: "due", condition: "is", value: "this_week" })])).toEqual(["a"]);
    expect(matchingIds([rule({ column_id: "due", condition: "before", value: "today" })])).toEqual(["b"]);
  });

  test("checkbox and text rules", () => {
    expect(matchingIds([rule({ column_id: "done", condition: "is_checked" })])).toEqual(["a"]);
    expect(matchingIds([rule({ column_id: "name", condition: "starts_with", value: "g" })])).toEqual(["c"]);
  });

  test("rules saved before typed conditions still match on text", () => {
    expect(matchingIds([rule({ column_id: "status", condition: "equals", value: "stuck" })])).toEqual(["b"]);
  });
});

describe("combining rules", () => {
  test("incomplete rules are ignored", () => {
    expect(isRuleComplete(rule({ column_id: "status", condition: "is" }))).toBe(false);
    expect(matchingIds([rule({ column_id: "status", condition: "is" })])).toEqual(["a", "b", "c"]);
  });

  test("the top level operator and nested groups combine rules", () => {
    const is_done = rule({ column_id: "status", condition: "is", values: ["done"] });
    const is_stuck = rule({ column_id: "status", condition: "is", values: ["stuck"] });
    expect(matchingIds([is_done, is_stuck], "or")).toEqual(["a", "b"]);

    const matcher = buildAdvancedFilterMatcher(
      {
        rules: [rule({ column_id: "name", condition: "contains", value: "a" })],
        groups: [{ id: "g", join_operator: "or", rules: [is_stuck, rule({ column_id: "done", condition: "is_checked" })] }],
        operator: "and",
      },
      FIELDS_BY_ID,
      CONTEXT
    )!;
    expect(ROWS.filter((row) => matcher(row, null)).map((row) => row.id)).toEqual(["a", "b"]);
  });
});

describe("quick filter facets", () => {
  const facets = buildQuickFilterFacets(FIELDS, []);

  test("text fields are left out and blanks get their own option", () => {
    expect(facets.map((facet) => facet.id)).toEqual(["status", "owners", "budget", "due", "done"]);
    const status = facets.find((facet) => facet.id === "status")!;
    expect(status.getOptionIds(ROWS[2], CONTEXT)).toEqual(["__blank__"]);
  });

  test("date rows fall into every bucket that covers them", () => {
    const due = facets.find((facet) => facet.id === "due")!;
    expect(due.getOptionIds(ROWS[0], CONTEXT)).toEqual(["this_week", "this_month", "upcoming"]);
    expect(due.getOptionIds(ROWS[1], CONTEXT)).toEqual(["overdue", "this_month"]);
  });
});

describe("row values and chips", () => {
  test("filter by this value builds the natural rule for the cell", () => {
    expect(buildRuleFromRowValue(FIELDS_BY_ID.get("status")!, ROWS[0])).toMatchObject({ condition: "is", values: ["done"] });
    expect(buildRuleFromRowValue(FIELDS_BY_ID.get("status")!, ROWS[2])).toMatchObject({ condition: "is_empty" });
    expect(buildRuleFromRowValue(FIELDS_BY_ID.get("budget")!, ROWS[1], true)).toMatchObject({ condition: "not_equals", value: "120" });
  });

  test("rules are described in plain words", () => {
    const status = FIELDS_BY_ID.get("status")!;
    expect(describeFilterRule(status, rule({ column_id: "status", condition: "is", values: ["done", "stuck"] }), [])).toBe(
      "Status is Done, Stuck"
    );
    expect(describeFilterRule(FIELDS_BY_ID.get("due")!, rule({ column_id: "due", condition: "is", value: "this_week" }), [])).toBe(
      "Due is this week"
    );
  });

  test("evaluateFilterRule handles a single row directly", () => {
    expect(evaluateFilterRule(FIELDS_BY_ID.get("done")!, ROWS[1], rule({ column_id: "done", condition: "is_unchecked" }), CONTEXT)).toBe(true);
  });
});

describe("deriveBoardRows", () => {
  const config: BoardToolbarConfig<Row> = {
    columns: [],
    default_groups: [{ id: "g1", name: "Group", accent_color: "#000", rows: ROWS }],
    getRowId: (row) => row.id,
    getColumnText: (row) => row.name,
    persons: [],
    getPersonIds: (row) => row.owners,
    current_person_id: CONTEXT.current_person_id,
    sort_options: [{ id: "budget", label: "Budget", getValue: (row) => row.budget }],
    group_by_options: [{ id: "default", label: "Default tables" }],
    filter_fields: FIELDS,
  };
  const state = {
    search_query: "",
    search_column_ids: [],
    selected_person_ids: [],
    quick_filter_selections: {},
    quick_filter_exclusions: {},
    include_subitems: false,
    person_column_ids: null,
    selected_team_ids: [],
    search_include_subitems: false,
    search_include_updates: false,
    advanced_filter_rows: [],
    advanced_filter_groups: [],
    advanced_filter_operator: "and" as const,
    sort_rules: [],
    hidden_column_ids: [],
    group_by_option_id: "default",
    group_order_direction: "asc" as const,
    show_empty_groups: false,
    conditional_color_rules: [],
  };
  const inputs = { quick_filter_facets: buildQuickFilterFacets(FIELDS, []), fields_by_id: FIELDS_BY_ID, filter_context: CONTEXT };

  test("empty values sort last in both directions", () => {
    for (const direction of ["asc", "desc"] as const) {
      const result = deriveBoardRows(
        config,
        { ...state, sort_rules: [{ id: "s", sort_option_id: "budget", direction, join_operator: "and" }] },
        inputs
      );
      expect(result.groups[0].rows.map((row) => row.id)).toEqual(direction === "asc" ? ["a", "b", "c"] : ["b", "a", "c"]);
    }
  });

  test("a facet's own picks are left out when counting it", () => {
    const with_status = { ...state, quick_filter_selections: { status: ["done"], done: ["unchecked"] } };
    const all_rows = deriveBoardRows(config, with_status, inputs);
    expect(all_rows.groups[0].rows).toEqual([]);
    expect(all_rows.active_filter_count).toBe(2);
    const counting_status = buildRowMatcher(config, with_status, inputs, { exclude_facet_id: "status" });
    expect(ROWS.filter(counting_status).map((row) => row.id)).toEqual(["b", "c"]);
  });
});

describe("toolbar filter upgrades", () => {
  type TreeRow = Row & { subs: TreeRow[] };
  const toTree = (row: Row, subs: Row[] = []): TreeRow => ({ ...row, subs: subs.map((sub) => ({ ...sub, subs: [] })) });
  const sub_status_field: BoardFilterField<TreeRow> = {
    ...(FIELDS[1] as unknown as BoardFilterField<TreeRow>),
    id: "sub_status",
    label: "Subitem status",
    scope: "subitem",
  };
  const tree_fields = [...(FIELDS as unknown as BoardFilterField<TreeRow>[]), sub_status_field];
  const tree_rows: TreeRow[] = [
    toTree(ROWS[0], [{ ...ROWS[2], id: "a1", status: "stuck" }, { ...ROWS[2], id: "a2", status: "done" }]),
    toTree(ROWS[1], [{ ...ROWS[2], id: "b1", status: "done" }]),
    toTree(ROWS[2]),
  ];
  const config: BoardToolbarConfig<TreeRow> = {
    columns: [],
    default_groups: [{ id: "g1", name: "Group", accent_color: "#000", rows: tree_rows }],
    getRowId: (row) => row.id,
    getColumnText: (row) => row.name,
    persons: [],
    getPersonIds: (row) => row.owners,
    current_person_id: CONTEXT.current_person_id,
    sort_options: [],
    group_by_options: [{ id: "default", label: "Default tables" }],
    filter_fields: tree_fields,
    getSubRows: (row) => row.subs,
    subitem_search_column_ids: ["name"],
    person_field_ids: ["owners"],
    teams: [{ id: "t1", name: "Design", member_ids: ["8"] }],
  };
  const base_state: BoardDerivationState = {
    search_query: "",
    search_column_ids: [],
    selected_person_ids: [],
    quick_filter_selections: {},
    quick_filter_exclusions: {},
    include_subitems: true,
    person_column_ids: null,
    selected_team_ids: [],
    search_include_subitems: false,
    search_include_updates: false,
    advanced_filter_rows: [],
    advanced_filter_groups: [],
    advanced_filter_operator: "and",
    sort_rules: [],
    hidden_column_ids: [],
    group_by_option_id: "default",
    group_order_direction: "asc",
    show_empty_groups: false,
    conditional_color_rules: [],
  };
  const inputs = {
    quick_filter_facets: buildQuickFilterFacets(tree_fields, []),
    fields_by_id: new Map(tree_fields.map((field) => [field.id, field])),
    filter_context: CONTEXT,
  };
  const visibleIds = (patch: Partial<BoardDerivationState>) =>
    deriveBoardRows(config, { ...base_state, ...patch }, inputs).groups[0].rows.map((row) => row.id);

  test("a quick filter exclusion hides rows holding that value and counts as a filter", () => {
    expect(visibleIds({ quick_filter_exclusions: { status: ["done"] } })).toEqual(["b", "c"]);
    const result = deriveBoardRows(config, { ...base_state, quick_filter_exclusions: { status: ["done"] } }, inputs);
    expect(result.active_filter_count).toBe(1);
  });

  test("a paused rule narrows nothing", () => {
    const paused = rule({ column_id: "status", condition: "is", values: ["done"], is_disabled: true });
    expect(visibleIds({ advanced_filter_rows: [paused] })).toEqual(["a", "b", "c"]);
  });

  test("subitem rules match parents through a subitem and report the matching subitems", () => {
    const sub_done = rule({ column_id: "sub_status", condition: "is", values: ["done"] });
    const result = deriveBoardRows(config, { ...base_state, advanced_filter_rows: [sub_done] }, inputs);
    expect(result.groups[0].rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(result.visible_subitem_ids).toEqual({ a: ["a2"], b: ["b1"] });

    // Item and subitem rules must hold on the same pair: Stuck parent with a Done subitem.
    const item_stuck = rule({ id: "r2", column_id: "status", condition: "is", values: ["stuck"] });
    expect(visibleIds({ advanced_filter_rows: [sub_done, item_stuck] })).toEqual(["b"]);

    // A parent without subitems reads the subitem column as empty.
    expect(visibleIds({ advanced_filter_rows: [rule({ column_id: "sub_status", condition: "is_empty" })] })).toEqual(["c"]);
  });

  test("the person filter reads teams and the picked people columns", () => {
    expect(visibleIds({ selected_team_ids: ["t1"] })).toEqual(["b"]);
    expect(visibleIds({ selected_person_ids: ["7"], person_column_ids: ["owners"] })).toEqual(["a"]);
  });

  test("search can match subitems", () => {
    const subitem_config = { ...config, getColumnText: (row: TreeRow) => row.id };
    const search = { ...base_state, search_query: "b1" };
    const rows = (state: BoardDerivationState) => deriveBoardRows(subitem_config, state, inputs).groups[0].rows.map((row) => row.id);
    expect(rows(search)).toEqual([]);
    expect(rows({ ...search, search_include_subitems: true })).toEqual(["b"]);
  });
});

describe("quick filters to advanced rules", () => {
  test("option picks merge into one rule and exclusions become their own", () => {
    const { rules, or_group } = buildRulesFromQuickFacet(FIELDS[1], ["done", "stuck"], ["__blank__"]);
    expect(or_group).toBeNull();
    expect(rules.map((entry) => [entry.condition, entry.values])).toEqual([
      ["is", ["done", "stuck"]],
      ["is_not_empty", []],
    ]);
  });

  test("several date buckets become an Or group matching the same rows", () => {
    const due = FIELDS.find((field) => field.id === "due")!;
    const { rules, or_group } = buildRulesFromQuickFacet(due, ["overdue", "this_week"], []);
    expect(rules).toEqual([]);
    const matcher = buildAdvancedFilterMatcher(
      { rules: [], groups: [{ id: "g", join_operator: "or", rules: or_group!.map((entry, index) => ({ ...entry, id: String(index) })) }], operator: "and" },
      FIELDS_BY_ID,
      CONTEXT
    )!;
    expect(ROWS.filter((row) => matcher(row, null)).map((row) => row.id)).toEqual(["a", "b"]);
  });
});
