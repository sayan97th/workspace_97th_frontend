import type { BoardColumn, BoardGroup } from "../types";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  type BoardAdvancedFilterCondition,
  type BoardAdvancedFilterRow,
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
  sort_rules: BoardSortRule[];
  hidden_column_ids: string[];
  group_by_option_id: string;
  group_order_direction: BoardSortDirection;
  show_empty_groups: boolean;
};

export type BoardDerivedRows<TRow> = {
  groups: BoardGroup<TRow>[];
  visible_columns: BoardColumn[];
  total_row_count: number;
  visible_row_count: number;
  active_filter_count: number;
};

const evaluateCondition = (
  text: string,
  condition: BoardAdvancedFilterCondition,
  value: string
): boolean => {
  const haystack = text.trim().toLowerCase();
  const needle = value.trim().toLowerCase();
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
  return String(a).localeCompare(String(b));
};

export function deriveBoardRows<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: BoardDerivationState
): BoardDerivedRows<TRow> {
  const flattened_rows = config.default_groups.flatMap((group) => group.rows);

  const matchesSearch = (row: TRow) => {
    const query = state.search_query.trim().toLowerCase();
    if (!query) return true;
    const haystack = state.search_column_ids
      .map((column_id) => config.getColumnText(row, column_id))
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  };

  const matchesQuickFilters = (row: TRow) =>
    config.quick_filter_facets.every((facet) => {
      const selected = state.quick_filter_selections[facet.id];
      if (!selected?.length) return true;
      const option_ids = facet.getOptionIds(row);
      return option_ids.some((id) => selected.includes(id));
    });

  const active_advanced_filter_rows = state.advanced_filter_rows.filter(
    (row) => row.column_id && row.condition
  );

  const matchesAdvancedFilters = (row: TRow) =>
    active_advanced_filter_rows.every((filter_row) =>
      evaluateCondition(
        config.getColumnText(row, filter_row.column_id!),
        filter_row.condition!,
        filter_row.value
      )
    );

  const matchesPerson = (row: TRow) => {
    if (!state.selected_person_ids.length) return true;
    const person_ids = config.getPersonIds(row);
    return person_ids.some((id) => state.selected_person_ids.includes(id));
  };

  const matchesEverything = (row: TRow) =>
    matchesSearch(row) && matchesQuickFilters(row) && matchesAdvancedFilters(row) && matchesPerson(row);

  let groups: BoardGroup<TRow>[];

  if (state.group_by_option_id === BOARD_DEFAULT_GROUP_BY_ID) {
    groups = config.default_groups.map((group) => ({
      ...group,
      rows: group.rows.filter(matchesEverything),
    }));
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

    const direction_multiplier = state.group_order_direction === "asc" ? 1 : -1;
    keys.sort((a, b) => compareValues(a, b) * direction_multiplier);

    groups = keys.map((key) => ({
      id: key,
      rows: buckets.get(key) ?? [],
      name: option?.getGroupLabel?.(key) ?? key,
      accent_color: option?.getGroupColor?.(key) ?? "#8fb4c9",
    }));
  }

  const active_sort_rules = state.sort_rules.filter((rule) => rule.sort_option_id);
  if (active_sort_rules.length) {
    const comparators = active_sort_rules.map((rule) => {
      const sort_option = config.sort_options.find((o) => o.id === rule.sort_option_id)!;
      const direction_multiplier = rule.direction === "asc" ? 1 : -1;
      return (a: TRow, b: TRow) =>
        compareValues(sort_option.getValue(a), sort_option.getValue(b)) * direction_multiplier;
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

  const active_filter_count =
    active_advanced_filter_rows.length +
    Object.values(state.quick_filter_selections).reduce((sum, ids) => sum + ids.length, 0);

  return {
    groups,
    visible_columns,
    total_row_count: flattened_rows.length,
    visible_row_count,
    active_filter_count,
  };
}
