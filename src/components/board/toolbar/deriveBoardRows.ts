import type { BoardColumn, BoardGroup } from "../types";
import { BOARD_FILTER_BLANK_OPTION_ID, buildAdvancedFilterMatcher, countActiveAdvancedRules, hasSubitemRules } from "./filterEngine";
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
  quick_filter_exclusions: Record<string, string[]>;
  include_subitems: boolean;
  person_column_ids: string[] | null;
  selected_team_ids: string[];
  search_include_subitems: boolean;
  search_include_updates: boolean;
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
  visible_subitem_ids: Record<string, string[]> | null;
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

/** Whether a row's facet option ids pass that facet's picks (any of them) and exclusions (none of them). */
const passesFacet = (ids: string[], selected: string[], excluded: string[]) =>
  (selected.length === 0 || ids.some((id) => selected.includes(id))) && !ids.some((id) => excluded.includes(id));

/** Which checks {@link buildRowEvaluator} leaves out, so a panel can count matches given every other filter. */
export type BoardRowMatcherOptions = {
  /** Leaves this Quick filters facet out (its own live counts). */
  exclude_facet_id?: string;
  /** Leaves the Person filter out (the Person panel's own counts). */
  exclude_person?: boolean;
};

export type BoardRowEvaluation<TRow> = {
  is_match: boolean;
  /** The subitems that match the subitem filters, or null when no subitem filter applies. */
  matching_sub_rows: TRow[] | null;
};

/** The person ids the Person filter reads on a row: the picked People columns, or every one of them. */
export function buildPersonIdsReader<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: Pick<BoardDerivationState, "person_column_ids">,
  inputs: BoardFilterInputs<TRow>
): (row: TRow) => string[] {
  const field_ids = state.person_column_ids?.length ? state.person_column_ids : null;
  const fields = (field_ids ?? [])
    .map((id) => inputs.fields_by_id.get(id))
    .filter((field): field is BoardFilterField<TRow> => !!field?.getOptionIds);
  if (!field_ids || !fields.length) return config.getPersonIds;
  return (row) => Array.from(new Set(fields.flatMap((field) => field.getOptionIds!(row))));
}

/**
 * Builds the check every visible row must pass: search, Person, Quick filters
 * and Advanced filters, all combined with AND. With "Filter subitems" on, a
 * subitem rule or facet is checked against each subitem, the parent matches
 * when one of them passes together with every item rule, and those subitems
 * are reported so only they stay visible beneath it.
 */
export function buildRowEvaluator<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: BoardDerivationState,
  inputs: BoardFilterInputs<TRow>,
  options: BoardRowMatcherOptions = {}
): (row: TRow) => BoardRowEvaluation<TRow> {
  const query = state.search_query.trim().toLowerCase();
  // Empty `search_column_ids` means "no restriction, search every column",
  // matching how every sibling list (`hidden_column_ids`,
  // `pinned_column_ids`, ...) treats an empty selection as the permissive
  // default rather than "select nothing".
  const search_column_ids = state.search_column_ids.length ? state.search_column_ids : config.columns.map((c) => c.id);
  const subitem_search_column_ids = config.subitem_search_column_ids ?? [];
  const containsQuery = (row: TRow, column_ids: string[]) =>
    column_ids
      .map((column_id) => config.getColumnText(row, column_id))
      .join(" ")
      .toLowerCase()
      .includes(query);
  const matchesSearch = (row: TRow) => {
    if (!query) return true;
    if (containsQuery(row, search_column_ids)) return true;
    if (state.search_include_updates && config.update_match_row_ids?.has(config.getRowId(row))) return true;
    if (state.search_include_subitems && config.getSubRows) {
      return config.getSubRows(row).some((sub_row) => containsQuery(sub_row, subitem_search_column_ids));
    }
    return false;
  };

  const active_facets = inputs.quick_filter_facets
    .filter(
      (facet) =>
        facet.id !== options.exclude_facet_id &&
        (state.quick_filter_selections[facet.id]?.length || state.quick_filter_exclusions[facet.id]?.length)
    )
    .map((facet) => ({
      facet,
      selected: state.quick_filter_selections[facet.id] ?? [],
      excluded: state.quick_filter_exclusions[facet.id] ?? [],
    }));
  const item_facets = active_facets.filter(({ facet }) => facet.scope !== "subitem");
  const subitem_facets = active_facets.filter(({ facet }) => facet.scope === "subitem");
  const matchesItemFacets = (row: TRow) =>
    item_facets.every(({ facet, selected, excluded }) => passesFacet(facet.getOptionIds(row, inputs.filter_context), selected, excluded));
  const matchesSubitemFacets = (sub_row: TRow | null) =>
    subitem_facets.every(({ facet, selected, excluded }) =>
      passesFacet(sub_row === null ? [BOARD_FILTER_BLANK_OPTION_ID] : facet.getOptionIds(sub_row, inputs.filter_context), selected, excluded)
    );

  const tree = {
    rules: state.advanced_filter_rows,
    groups: state.advanced_filter_groups,
    operator: state.advanced_filter_operator,
  };
  const matchesAdvanced = buildAdvancedFilterMatcher(tree, inputs.fields_by_id, inputs.filter_context) ?? (() => true);
  const has_subitem_filters = subitem_facets.length > 0 || hasSubitemRules(tree, inputs.fields_by_id);

  const team_member_ids = (config.teams ?? [])
    .filter((team) => state.selected_team_ids.includes(team.id))
    .flatMap((team) => team.member_ids);
  const wanted_person_ids = new Set([...state.selected_person_ids, ...team_member_ids]);
  const is_person_active = !options.exclude_person && (state.selected_person_ids.length > 0 || state.selected_team_ids.length > 0);
  const readPersonIds = buildPersonIdsReader(config, state, inputs);
  const matchesPerson = (row: TRow) => !is_person_active || readPersonIds(row).some((id) => wanted_person_ids.has(id));

  return (row: TRow) => {
    const passes_item_checks = matchesSearch(row) && matchesPerson(row) && matchesItemFacets(row);
    if (!has_subitem_filters) {
      return { is_match: passes_item_checks && matchesAdvanced(row, null), matching_sub_rows: null };
    }
    if (!passes_item_checks) return { is_match: false, matching_sub_rows: [] };
    const sub_rows = config.getSubRows?.(row) ?? [];
    if (!sub_rows.length) {
      return { is_match: matchesSubitemFacets(null) && matchesAdvanced(row, null), matching_sub_rows: [] };
    }
    const matching_sub_rows = sub_rows.filter((sub_row) => matchesSubitemFacets(sub_row) && matchesAdvanced(row, sub_row));
    return { is_match: matching_sub_rows.length > 0, matching_sub_rows };
  };
}

/** {@link buildRowEvaluator}, reduced to a yes/no per row. */
export function buildRowMatcher<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: BoardDerivationState,
  inputs: BoardFilterInputs<TRow>,
  options: BoardRowMatcherOptions = {}
): (row: TRow) => boolean {
  const evaluate = buildRowEvaluator(config, state, inputs, options);
  return (row) => evaluate(row).is_match;
}

export function deriveBoardRows<TRow>(
  config: BoardToolbarConfig<TRow>,
  state: BoardDerivationState,
  inputs: BoardFilterInputs<TRow>
): BoardDerivedRows<TRow> {
  const flattened_rows = config.default_groups.flatMap((group) => group.rows);
  const evaluate = buildRowEvaluator(config, state, inputs);
  // Every row is evaluated once, which also records the subitems left visible under it.
  let visible_subitem_ids: Record<string, string[]> | null = null;
  const match_by_row = new Map<TRow, boolean>();
  for (const row of flattened_rows) {
    const { is_match, matching_sub_rows } = evaluate(row);
    match_by_row.set(row, is_match);
    if (matching_sub_rows && is_match) {
      visible_subitem_ids ??= {};
      visible_subitem_ids[config.getRowId(row)] = matching_sub_rows.map(config.getRowId);
    }
  }
  const matchesEverything = (row: TRow) => match_by_row.get(row) ?? false;

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
    [state.quick_filter_selections, state.quick_filter_exclusions].reduce(
      (total, selections) =>
        total + Object.entries(selections).reduce((sum, [facet_id, ids]) => sum + (facet_ids.has(facet_id) ? ids.length : 0), 0),
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
    visible_subitem_ids,
    row_colors,
    cell_colors,
  };
}
