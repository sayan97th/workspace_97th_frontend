import type { BoardColumn, BoardGroup } from "../types";
import { buildAdvancedFilterMatcher, countActiveAdvancedRules } from "./filterEngine";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  BOARD_EMPTY_GROUP_KEY,
  type BoardAdvancedFilterCondition,
  type BoardAdvancedFilterGroup,
  type BoardAdvancedFilterRow,
  type BoardConditionalColorRule,
  type BoardFilterContext,
  type BoardFilterField,
  type BoardFilterJoinOperator,
  type BoardQuickFilterFacet,
  type BoardSortDirection,
  type BoardSortRule,
  type BoardToolbarConfig,
} from "./types";

export type BoardDerivationState = {
  search_query: string;
  search_column_ids: string[];
  selected_person_ids: string[];
  quick_filter_selections: Record<string, string[]>;
  advanced_filter_rows: BoardAdvancedFilterRow[];
  advanced_filter_groups: BoardAdvancedFilterGroup[];
  advanced_filter_operator: BoardFilterJoinOperator;
  sort_rules: BoardSortRule[];
  hidden_column_ids: string[];
  group_by_option_id: string;
  group_order_direction: BoardSortDirection;
  show_empty_groups: boolean;
  conditional_color_rules: BoardConditionalColorRule[];
};

/** Inputs derived once per config by `useBoardToolbar`, shared by every row check. */
export type BoardFilterInputs<TRow> = {
  quick_filter_facets: BoardQuickFilterFacet<TRow>[];
  fields_by_id: Map<string, BoardFilterField<TRow>>;
  filter_context: BoardFilterContext;
};

export type BoardDerivedRows<TRow> = {
  groups: BoardGroup<TRow>[];
  visible_columns: BoardColumn[];
  total_row_count: number;
  visible_row_count: number;
  active_filter_count: number;
  row_colors: Record<string, string>;
  cell_colors: Record<string, Record<string, string>>;
};

/** Used by Conditional coloring, which matches a column's display text against one of four text conditions. */
export const evaluateCondition = (
  text: string,
  condition: BoardAdvancedFilterCondition,
  value: string
): boolean => {
  const haystack = (text ?? "").trim().toLowerCase();
  const needle = (value ?? "").trim().toLowerCase();
  switch (condition) {
    case "equals":
      return haystack === needle;
    case "contains":
      return needle === "" || haystack.includes(needle);
    case "is_empty":
      return haystack === "";
    case "is_not_empty":
      return haystack !== "";
  }
};

const compareValues = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

/** Sort comparator where an empty (null) value always lands last, whichever the direction. */
const compareNullableValues = (
  a: string | number | null,
  b: string | number | null,
  direction_multiplier: number
): number => {
  const is_a_empty = a === null || a === "";
  const is_b_empty = b === null || b === "";
  if (is_a_empty || is_b_empty) return Number(is_a_empty) - Number(is_b_empty);
  return compareValues(a, b) * direction_multiplier;
};

/**
 * Builds the predicate every visible row must pass: search, Person, Quick
 * filters and Advanced filters, all combined with AND. `exclude_facet_id`
 * leaves one Quick filters facet out, which is how each facet's live counts
 * reflect every other active filter without being narrowed by its own picks.
 */
export function buildRowMatcher<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: BoardDerivationState,
  inputs: BoardFilterInputs<TRow>,
  exclude_facet_id?: string
): (row: TRow) => boolean {
  const query = state.search_query.trim().toLowerCase();
  // Empty `search_column_ids` means "no restriction, search every column",
  // matching how every sibling list (`hidden_column_ids`,
  // `pinned_column_ids`, ...) treats an empty selection as the permissive
  // default rather than "select nothing".
  const search_column_ids = state.search_column_ids.length ? state.search_column_ids : config.columns.map((c) => c.id);
  const matchesSearch = (row: TRow) =>
    !query ||
    search_column_ids
      .map((column_id) => config.getColumnText(row, column_id))
      .join(" ")
      .toLowerCase()
      .includes(query);

  const active_facets = inputs.quick_filter_facets
    .filter((facet) => facet.id !== exclude_facet_id && state.quick_filter_selections[facet.id]?.length)
    .map((facet) => ({ facet, selected: state.quick_filter_selections[facet.id] }));
  const matchesQuickFilters = (row: TRow) =>
    active_facets.every(({ facet, selected }) =>
      facet.getOptionIds(row, inputs.filter_context).some((id) => selected.includes(id))
    );

  const matchesAdvancedFilters =
    buildAdvancedFilterMatcher(
      {
        rules: state.advanced_filter_rows,
        groups: state.advanced_filter_groups,
        operator: state.advanced_filter_operator,
      },
      inputs.fields_by_id,
      inputs.filter_context
    ) ?? (() => true);

  const matchesPerson = (row: TRow) => {
    if (!state.selected_person_ids.length) return true;
    return config.getPersonIds(row).some((id) => state.selected_person_ids.includes(id));
  };

  return (row: TRow) => matchesSearch(row) && matchesPerson(row) && matchesQuickFilters(row) && matchesAdvancedFilters(row);
}

export function deriveBoardRows<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: BoardDerivationState,
  inputs: BoardFilterInputs<TRow>
): BoardDerivedRows<TRow> {
  const flattened_rows = config.default_groups.flatMap((group) => group.rows);
  const matchesEverything = buildRowMatcher(config, state, inputs);

  let groups: BoardGroup<TRow>[];

  if (state.group_by_option_id === BOARD_DEFAULT_GROUP_BY_ID) {
    groups = config.default_groups
      .map((group) => ({
        ...group,
        rows: group.rows.filter(matchesEverything),
      }))
      // Priority-client groups always render first (their tasks "above
      // all"), preserving relative order otherwise — `sort` is stable, so
      // this only ever moves priority groups up, never reshuffles ties.
      .sort((a, b) => Number(!!b.is_priority) - Number(!!a.is_priority));
  } else {
    const option = config.group_by_options.find((o) => o.id === state.group_by_option_id);
    const buckets = new Map<string, TRow[]>();
    const seen_keys_for_empty_groups = new Set<string>();

    for (const row of flattened_rows) {
      const key = option?.getGroupKey?.(row) ?? "other";
      seen_keys_for_empty_groups.add(key);
      if (!matchesEverything(row)) continue;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(row);
      else buckets.set(key, [row]);
    }

    const keys = state.show_empty_groups
      ? Array.from(seen_keys_for_empty_groups)
      : Array.from(buckets.keys());

    // The empty bucket ("No status", "No date", ...) always renders last,
    // whichever the direction, just like empty cells in a sort.
    const direction_multiplier = state.group_order_direction === "asc" ? 1 : -1;
    const getSortValue = (key: string) =>
      key === BOARD_EMPTY_GROUP_KEY ? null : option?.getGroupSortValue?.(key) ?? key;
    keys.sort((a, b) => compareNullableValues(getSortValue(a), getSortValue(b), direction_multiplier));

    groups = keys.map((key) => ({
      id: key,
      rows: buckets.get(key) ?? [],
      name: option?.getGroupLabel?.(key) ?? key,
      accent_color: option?.getGroupColor?.(key) ?? "#8fb4c9",
    }));
  }

  // A rule pointing at a deleted column is skipped instead of crashing the comparator.
  const active_sort_rules = state.sort_rules.filter((rule) =>
    config.sort_options.some((option) => option.id === rule.sort_option_id)
  );
  if (active_sort_rules.length) {
    const comparators = active_sort_rules.map((rule) => {
      const sort_option = config.sort_options.find((o) => o.id === rule.sort_option_id)!;
      const direction_multiplier = rule.direction === "asc" ? 1 : -1;
      return (a: TRow, b: TRow) =>
        compareNullableValues(sort_option.getValue(a), sort_option.getValue(b), direction_multiplier);
    });
    groups = groups.map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => {
        for (const compare of comparators) {
          const result = compare(a, b);
          if (result !== 0) return result;
        }
        return 0;
      }),
    }));
  }

  const visible_columns = config.columns.filter(
    (column) => column.hideable === false || !state.hidden_column_ids.includes(column.id)
  );

  const visible_row_count = groups.reduce((sum, group) => sum + group.rows.length, 0);

  const facet_ids = new Set(inputs.quick_filter_facets.map((facet) => facet.id));
  const active_filter_count =
    countActiveAdvancedRules(
      { rules: state.advanced_filter_rows, groups: state.advanced_filter_groups, operator: state.advanced_filter_operator },
      inputs.fields_by_id
    ) +
    Object.entries(state.quick_filter_selections).reduce(
      (sum, [facet_id, ids]) => sum + (facet_ids.has(facet_id) ? ids.length : 0),
      0
    );

  const active_color_rules = state.conditional_color_rules.filter(
    (rule) => rule.column_id && rule.condition
  );
  const row_colors: Record<string, string> = {};
  const cell_colors: Record<string, Record<string, string>> = {};
  if (active_color_rules.length) {
    for (const row of flattened_rows) {
      const row_id = config.getRowId(row);
      let row_color: string | undefined;
      let row_cell_colors: Record<string, string> | undefined;

      for (const rule of active_color_rules) {
        const matches = evaluateCondition(
          config.getColumnText(row, rule.column_id!),
          rule.condition!,
          rule.value
        );
        if (!matches) continue;

        if (rule.scope === "row") {
          if (!row_color) row_color = rule.color;
        } else if (!row_cell_colors?.[rule.column_id!]) {
          row_cell_colors = { ...row_cell_colors, [rule.column_id!]: rule.color };
        }
      }

      if (row_color) row_colors[row_id] = row_color;
      if (row_cell_colors) cell_colors[row_id] = row_cell_colors;
    }
  }

  return {
    groups,
    visible_columns,
    total_row_count: flattened_rows.length,
    visible_row_count,
    active_filter_count,
    row_colors,
    cell_colors,
  };
}
