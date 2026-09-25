"use client";
import { useMemo, useState } from "react";
import type { BoardRowHeight } from "../types";
import {
  buildPersonIdsReader,
  buildRowMatcher,
  deriveBoardRows,
  type BoardDerivationState,
  type BoardFilterInputs,
} from "./deriveBoardRows";
import { buildQuickFilterFacets, buildRulesFromQuickFacet, getDefaultOperator, getTodayIso, isSubitemField } from "./filterEngine";
import {
  BOARD_CONDITIONAL_COLOR_PALETTE,
  BOARD_DEFAULT_GROUP_BY_ID,
  type BoardAdvancedFilterGroup,
  type BoardAdvancedFilterRow,
  type BoardConditionalColorRule,
  type BoardFilterJoinOperator,
  type BoardSortDirection,
  type BoardSortRule,
  type BoardToolbarApi,
  type BoardToolbarConfig,
  type BoardToolbarFilterState,
  type BoardToolbarPanelId,
} from "./types";

const createId = () => Math.random().toString(36).slice(2, 10);

const createBlankRule = (column_id: string | null = null): BoardAdvancedFilterRow => ({
  id: createId(),
  column_id,
  condition: null,
  value: "",
  values: [],
});

/** Gives saved rules fresh local ids (React keys) and restores defaults a JSON round trip can drop. */
const withFreshRuleIds = (rules: Omit<BoardAdvancedFilterRow, "id">[] | BoardAdvancedFilterRow[]): BoardAdvancedFilterRow[] =>
  rules.map((rule) => ({
    column_id: rule.column_id ?? null,
    condition: rule.condition ?? null,
    value: rule.value ?? "",
    values: rule.values ?? [],
    ...(rule.is_disabled ? { is_disabled: true } : {}),
    id: createId(),
  }));

/** Inserts a copy of the rule `id` (fresh id) right below it. */
const duplicateById = (rules: BoardAdvancedFilterRow[], id: string): BoardAdvancedFilterRow[] => {
  const index = rules.findIndex((rule) => rule.id === id);
  if (index < 0) return rules;
  const next = rules.slice();
  next.splice(index + 1, 0, { ...rules[index], values: [...(rules[index].values ?? [])], id: createId() });
  return next;
};

/** A selection map without empty entries, or picks for a facet id missing from `keep_ids`. */
const pruneSelections = (selections: Record<string, string[]>, keep_ids: string[] | null) =>
  Object.fromEntries(
    Object.entries(selections).filter(([facet_id, ids]) => ids.length > 0 && (keep_ids === null || keep_ids.includes(facet_id)))
  );

/** Moves the item with `active_id` to the index of `over_id`, keeping everything else in order. */
const moveById = <T extends { id: string }>(list: T[], active_id: string, over_id: string): T[] => {
  const from = list.findIndex((item) => item.id === active_id);
  const to = list.findIndex((item) => item.id === over_id);
  if (from < 0 || to < 0 || from === to) return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export function useBoardToolbar<TRow>(config: BoardToolbarConfig<TRow>): BoardToolbarApi<TRow> {
  const [active_panel, setActivePanel] = useState<BoardToolbarPanelId | null>(null);

  const [is_search_open, setIsSearchOpen] = useState(false);
  const [is_search_focused, setIsSearchFocused] = useState(false);
  const [search_query, setSearchQueryState] = useState("");
  const [search_column_ids, setSearchColumnIds] = useState<string[]>(() =>
    config.columns.map((column) => column.id)
  );
  const [active_match_index, setActiveMatchIndex] = useState(0);
  // Any query edit restarts jump-navigation at the first match, mirroring a
  // browser's own in-page find.
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
    setActiveMatchIndex(0);
  };

  const [search_include_subitems, setSearchIncludeSubitems] = useState(false);
  const [search_include_updates, setSearchIncludeUpdates] = useState(false);

  const [selected_person_ids, setSelectedPersonIds] = useState<string[]>([]);
  const [selected_team_ids, setSelectedTeamIds] = useState<string[]>([]);
  const [person_column_ids, setPersonColumnIds] = useState<string[] | null>(null);

  const [quick_filter_selections, setQuickFilterSelections] = useState<Record<string, string[]>>({});
  const [quick_filter_exclusions, setQuickFilterExclusions] = useState<Record<string, string[]>>({});
  const [include_subitems, setIncludeSubitemsState] = useState(false);
  const [quick_filter_column_ids, setQuickFilterColumnIdsState] = useState<string[] | null>(null);

  const [filter_mode, setFilterMode] = useState<"quick" | "advanced">("quick");
  const [advanced_filter_rows, setAdvancedFilterRows] = useState<BoardAdvancedFilterRow[]>([]);
  const [advanced_filter_groups, setAdvancedFilterGroups] = useState<BoardAdvancedFilterGroup[]>([]);
  const [advanced_filter_operator, setAdvancedFilterOperator] = useState<BoardFilterJoinOperator>("and");
  // Fixed for the session: relative dates ("Today", "This week") resolve
  // against the day the board was opened, exactly like the API is told.
  const [today] = useState(getTodayIso);

  const [sort_rules, setSortRules] = useState<BoardSortRule[]>([]);

  const [hidden_column_ids, setHiddenColumnIds] = useState<string[]>([]);

  const [pinned_column_ids, setPinnedColumnIds] = useState<string[]>([]);

  const [group_by_option_id, setGroupByOptionId] = useState(BOARD_DEFAULT_GROUP_BY_ID);
  const [group_order_direction, setGroupOrderDirection] = useState<BoardSortDirection>("asc");
  const [show_empty_groups, setShowEmptyGroups] = useState(false);

  const [row_height, setRowHeight] = useState<BoardRowHeight>("single");

  const [conditional_color_rules, setConditionalColorRules] = useState<BoardConditionalColorRule[]>([]);

  const openPanel = (id: BoardToolbarPanelId) => setActivePanel(id);
  const closePanel = () => setActivePanel(null);
  const togglePanel = (id: BoardToolbarPanelId) =>
    setActivePanel((current) => (current === id ? null : id));

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => {
    setIsSearchOpen(false);
    setIsSearchFocused(false);
    setSearchQuery("");
    if (active_panel === "search_columns") closePanel();
  };

  const focusSearch = () => setIsSearchFocused(true);
  const blurSearch = () => setIsSearchFocused(false);

  const toggleSearchColumnId = (column_id: string) =>
    setSearchColumnIds((current) =>
      current.includes(column_id)
        ? current.filter((id) => id !== column_id)
        : [...current, column_id]
    );
  const setAllSearchColumns = (selected: boolean) =>
    setSearchColumnIds(selected ? config.columns.map((column) => column.id) : []);

  const togglePersonId = (id: string) =>
    setSelectedPersonIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  const toggleTeamId = (id: string) =>
    setSelectedTeamIds((current) => (current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]));
  const clearPersonFilter = () => {
    setSelectedPersonIds([]);
    setSelectedTeamIds([]);
  };

  const toggleIn = (map: Record<string, string[]>, facet_id: string, option_id: string) => {
    const current = map[facet_id] ?? [];
    return { ...map, [facet_id]: current.includes(option_id) ? current.filter((id) => id !== option_id) : [...current, option_id] };
  };
  const removeFrom = (map: Record<string, string[]>, facet_id: string, option_id: string) =>
    map[facet_id]?.includes(option_id) ? { ...map, [facet_id]: map[facet_id].filter((id) => id !== option_id) } : map;

  // A value is either picked or excluded, never both.
  const toggleQuickFilterOption = (facet_id: string, option_id: string) => {
    setQuickFilterSelections((current) => toggleIn(current, facet_id, option_id));
    setQuickFilterExclusions((current) => removeFrom(current, facet_id, option_id));
  };
  const toggleQuickFilterExclusion = (facet_id: string, option_id: string) => {
    setQuickFilterExclusions((current) => toggleIn(current, facet_id, option_id));
    setQuickFilterSelections((current) => removeFrom(current, facet_id, option_id));
  };
  const selectOnlyQuickFilterOption = (facet_id: string, option_id: string) => {
    setQuickFilterSelections((current) => ({ ...current, [facet_id]: [option_id] }));
    setQuickFilterExclusions((current) => ({ ...current, [facet_id]: [] }));
  };
  const clearQuickFilterFacet = (facet_id: string) => {
    const withoutFacet = (current: Record<string, string[]>) => {
      const { [facet_id]: _removed, ...rest } = current;
      return rest;
    };
    setQuickFilterSelections(withoutFacet);
    setQuickFilterExclusions(withoutFacet);
  };
  const clearQuickFilters = () => {
    setQuickFilterSelections({});
    setQuickFilterExclusions({});
  };
  /** Hiding a facet also drops its picks, so no filter keeps applying from a facet nobody can see. */
  const setQuickFilterColumnIds = (ids: string[] | null) => {
    setQuickFilterColumnIdsState(ids);
    if (ids) {
      setQuickFilterSelections((current) => pruneSelections(current, ids));
      setQuickFilterExclusions((current) => pruneSelections(current, ids));
    }
  };

  const subitem_field_ids = config.filter_fields.filter(isSubitemField).map((field) => field.id);
  /** Switching "Filter subitems" off also drops every subitem rule and pick, so nothing keeps filtering from a hidden field. */
  const setIncludeSubitems = (value: boolean) => {
    setIncludeSubitemsState(value);
    if (value) return;
    const isItemRule = (rule: BoardAdvancedFilterRow) => !rule.column_id || !subitem_field_ids.includes(rule.column_id);
    setAdvancedFilterRows((current) => current.filter(isItemRule));
    setAdvancedFilterGroups((current) =>
      current.map((group) => ({ ...group, rules: group.rules.filter(isItemRule) })).filter((group) => group.rules.length > 0)
    );
    const withoutSubitemFacets = (current: Record<string, string[]>) =>
      Object.fromEntries(Object.entries(current).filter(([facet_id]) => !subitem_field_ids.includes(facet_id)));
    setQuickFilterSelections(withoutSubitemFacets);
    setQuickFilterExclusions(withoutSubitemFacets);
  };

  const findFieldKind = (column_id: string) => config.filter_fields.find((field) => field.id === column_id)?.kind;

  const addAdvancedFilterRow = () => setAdvancedFilterRows((current) => [...current, createBlankRule()]);
  const addAdvancedFilterRowForColumn = (column_id: string) => {
    const kind = findFieldKind(column_id);
    setAdvancedFilterRows((current) => [
      ...current,
      { ...createBlankRule(column_id), condition: kind ? getDefaultOperator(kind) : null },
    ]);
  };
  const addAdvancedFilterRule = (rule: Omit<BoardAdvancedFilterRow, "id">) =>
    setAdvancedFilterRows((current) => [...current, ...withFreshRuleIds([rule])]);
  const removeAdvancedFilterRow = (id: string) =>
    setAdvancedFilterRows((current) => current.filter((row) => row.id !== id));
  const duplicateAdvancedFilterRow = (id: string) => setAdvancedFilterRows((current) => duplicateById(current, id));
  const moveAdvancedFilterRow = (active_id: string, over_id: string) =>
    setAdvancedFilterRows((current) => moveById(current, active_id, over_id));
  const updateAdvancedFilterRow = (id: string, patch: Partial<BoardAdvancedFilterRow>) =>
    setAdvancedFilterRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const updateGroup = (group_id: string, update: (group: BoardAdvancedFilterGroup) => BoardAdvancedFilterGroup) =>
    setAdvancedFilterGroups((current) => current.map((group) => (group.id === group_id ? update(group) : group)));
  const addAdvancedFilterGroup = () =>
    setAdvancedFilterGroups((current) => [...current, { id: createId(), join_operator: "and", rules: [createBlankRule()] }]);
  const removeAdvancedFilterGroup = (group_id: string) =>
    setAdvancedFilterGroups((current) => current.filter((group) => group.id !== group_id));
  const setAdvancedFilterGroupOperator = (group_id: string, operator: BoardFilterJoinOperator) =>
    updateGroup(group_id, (group) => ({ ...group, join_operator: operator }));
  const addAdvancedFilterGroupRule = (group_id: string) =>
    updateGroup(group_id, (group) => ({ ...group, rules: [...group.rules, createBlankRule()] }));
  const updateAdvancedFilterGroupRule = (group_id: string, rule_id: string, patch: Partial<BoardAdvancedFilterRow>) =>
    updateGroup(group_id, (group) => ({
      ...group,
      rules: group.rules.map((rule) => (rule.id === rule_id ? { ...rule, ...patch } : rule)),
    }));
  const duplicateAdvancedFilterGroupRule = (group_id: string, rule_id: string) =>
    updateGroup(group_id, (group) => ({ ...group, rules: duplicateById(group.rules, rule_id) }));
  const moveAdvancedFilterGroupRule = (group_id: string, active_id: string, over_id: string) =>
    updateGroup(group_id, (group) => ({ ...group, rules: moveById(group.rules, active_id, over_id) }));
  /** Removing a group's last rule removes the group itself, like monday. */
  const removeAdvancedFilterGroupRule = (group_id: string, rule_id: string) =>
    setAdvancedFilterGroups((current) =>
      current
        .map((group) => (group.id === group_id ? { ...group, rules: group.rules.filter((rule) => rule.id !== rule_id) } : group))
        .filter((group) => group.rules.length > 0)
    );

  const clearAdvancedFilters = () => {
    setAdvancedFilterRows([]);
    setAdvancedFilterGroups([]);
    setAdvancedFilterOperator("and");
  };

  const clearAllFilters = () => {
    clearQuickFilters();
    clearAdvancedFilters();
  };

  const applyFilterState = (filter_state: BoardToolbarFilterState) => {
    // An empty PHP array json-encodes as a list, so a saved empty map can come back as `[]`.
    const toMap = (value: Record<string, string[]> | undefined) => (!value || Array.isArray(value) ? {} : { ...value });
    setSearchQuery(filter_state.search_query ?? "");
    setSearchColumnIds(filter_state.search_column_ids ?? []);
    setSearchIncludeSubitems(!!filter_state.search_include_subitems);
    setSearchIncludeUpdates(!!filter_state.search_include_updates);
    setSelectedPersonIds(filter_state.selected_person_ids ?? []);
    setSelectedTeamIds(filter_state.selected_team_ids ?? []);
    setPersonColumnIds(filter_state.person_column_ids ?? null);
    setIncludeSubitemsState(!!filter_state.include_subitems);
    setQuickFilterSelections(toMap(filter_state.quick_filter_selections));
    setQuickFilterExclusions(toMap(filter_state.quick_filter_exclusions));
    setQuickFilterColumnIdsState(filter_state.quick_filter_column_ids ?? null);
    setAdvancedFilterRows(withFreshRuleIds(filter_state.advanced_filter_rows ?? []));
    setAdvancedFilterGroups(
      (filter_state.advanced_filter_groups ?? []).map((group) => ({
        id: createId(),
        join_operator: group.join_operator === "or" ? "or" : "and",
        rules: withFreshRuleIds(group.rules ?? []),
      }))
    );
    setAdvancedFilterOperator(filter_state.advanced_filter_operator === "or" ? "or" : "and");
    // Open Advanced filters when the applied state has rules there, so a
    // viewer can see why rows are hidden.
    if ((filter_state.advanced_filter_rows?.length ?? 0) + (filter_state.advanced_filter_groups?.length ?? 0) > 0) {
      setFilterMode("advanced");
    }
  };

  const resetAllFilters = () => {
    clearAllFilters();
    clearPersonFilter();
    setSearchQuery("");
  };

  const addSortRule = () =>
    setSortRules((current) => [
      ...current,
      { id: createId(), sort_option_id: null, direction: "asc", join_operator: "and" },
    ]);
  const removeSortRule = (id: string) =>
    setSortRules((current) => current.filter((rule) => rule.id !== id));
  const updateSortRule = (id: string, patch: Partial<BoardSortRule>) =>
    setSortRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  const moveSortRule = (active_id: string, over_id: string) =>
    setSortRules((current) => moveById(current, active_id, over_id));
  const applySortRules = (rules: Omit<BoardSortRule, "id">[]) =>
    setSortRules(
      rules.map((rule) => ({
        id: createId(),
        sort_option_id: rule.sort_option_id ?? null,
        direction: rule.direction === "desc" ? "desc" : "asc",
        join_operator: rule.join_operator === "or" ? "or" : "and",
      }))
    );
  const clearSort = () => setSortRules([]);
  /**
   * Replaces `sort_rules` wholesale with a single rule for `column_id`, or
   * clears it entirely when `column_id`/`direction` is null — the toolbar
   * equivalent of the grid's own single-column click-to-sort header arrow,
   * so clicking it and using the Sort panel always agree on one state.
   */
  const setSingleSort = (column_id: string | null, direction: BoardSortDirection | null) =>
    setSortRules(column_id && direction ? [{ id: createId(), sort_option_id: column_id, direction, join_operator: "and" }] : []);

  const toggleColumnHidden = (id: string) =>
    setHiddenColumnIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  const showAllColumns = () => setHiddenColumnIds([]);
  const hideAllColumns = () =>
    setHiddenColumnIds(
      config.columns.filter((column) => column.hideable !== false).map((column) => column.id)
    );

  const addConditionalColorRule = () =>
    setConditionalColorRules((current) => [
      ...current,
      {
        id: createId(),
        color: BOARD_CONDITIONAL_COLOR_PALETTE[current.length % BOARD_CONDITIONAL_COLOR_PALETTE.length],
        scope: "row",
        column_id: null,
        condition: null,
        value: "",
      },
    ]);
  const removeConditionalColorRule = (id: string) =>
    setConditionalColorRules((current) => current.filter((rule) => rule.id !== id));
  const updateConditionalColorRule = (id: string, patch: Partial<BoardConditionalColorRule>) =>
    setConditionalColorRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule))
    );
  const clearConditionalColorRules = () => setConditionalColorRules([]);

  const togglePinnedColumn = (id: string) =>
    setPinnedColumnIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  const unpinAllColumns = () => setPinnedColumnIds([]);

  const filter_context = useMemo(
    () => ({ today, current_person_id: config.current_person_id }),
    [today, config.current_person_id]
  );
  // Subitem fields only exist while "Filter subitems" is on, for the pickers and for evaluation alike.
  const active_filter_fields = useMemo(
    () => (include_subitems ? config.filter_fields : config.filter_fields.filter((field) => !isSubitemField(field))),
    [config.filter_fields, include_subitems]
  );
  const quick_filter_facets = useMemo(
    () => buildQuickFilterFacets(active_filter_fields, config.persons),
    [active_filter_fields, config.persons]
  );
  const filter_inputs: BoardFilterInputs<TRow> = useMemo(
    () => ({
      quick_filter_facets,
      fields_by_id: new Map(active_filter_fields.map((field) => [field.id, field])),
      filter_context,
    }),
    [quick_filter_facets, active_filter_fields, filter_context]
  );

  /** Quick and Advanced always combine with And, so picks can move into Advanced only while its top level is And too. */
  const can_convert_quick_filters =
    [quick_filter_selections, quick_filter_exclusions].some((map) => Object.values(map).some((ids) => ids.length > 0)) &&
    (advanced_filter_operator === "and" || advanced_filter_rows.length + advanced_filter_groups.length === 0);

  const convertQuickFiltersToAdvanced = () => {
    if (!can_convert_quick_filters) return;
    const new_rules: BoardAdvancedFilterRow[] = [];
    const new_groups: BoardAdvancedFilterGroup[] = [];
    for (const facet of quick_filter_facets) {
      const field = filter_inputs.fields_by_id.get(facet.id);
      if (!field) continue;
      const { rules, or_group } = buildRulesFromQuickFacet(
        field,
        quick_filter_selections[facet.id] ?? [],
        quick_filter_exclusions[facet.id] ?? []
      );
      new_rules.push(...withFreshRuleIds(rules));
      if (or_group) new_groups.push({ id: createId(), join_operator: "or", rules: withFreshRuleIds(or_group) });
    }
    setAdvancedFilterRows((current) => [...current, ...new_rules]);
    setAdvancedFilterGroups((current) => [...current, ...new_groups]);
    setAdvancedFilterOperator("and");
    clearQuickFilters();
    setFilterMode("advanced");
  };

  const derivation_state: BoardDerivationState = useMemo(
    () => ({
      search_query,
      search_column_ids,
      selected_person_ids,
      quick_filter_selections,
      quick_filter_exclusions,
      include_subitems,
      person_column_ids,
      selected_team_ids,
      search_include_subitems,
      search_include_updates,
      advanced_filter_rows,
      advanced_filter_groups,
      advanced_filter_operator,
      sort_rules,
      hidden_column_ids,
      group_by_option_id,
      group_order_direction,
      show_empty_groups,
      conditional_color_rules,
    }),
    [
      search_query,
      search_column_ids,
      selected_person_ids,
      quick_filter_selections,
      quick_filter_exclusions,
      include_subitems,
      person_column_ids,
      selected_team_ids,
      search_include_subitems,
      search_include_updates,
      advanced_filter_rows,
      advanced_filter_groups,
      advanced_filter_operator,
      sort_rules,
      hidden_column_ids,
      group_by_option_id,
      group_order_direction,
      show_empty_groups,
      conditional_color_rules,
    ]
  );

  const derived = useMemo(
    () => deriveBoardRows(config, derivation_state, filter_inputs),
    [config, derivation_state, filter_inputs]
  );

  /**
   * Quick filters live counts: for each facet, how many rows would match each
   * option given every *other* active filter (search, Person, Advanced and the
   * other facets), the usual faceted-search behavior. Only computed while the
   * Quick filters panel is open, since it walks every row once per facet.
   */
  const is_quick_panel_open = active_panel === "filter" && filter_mode === "quick";
  const quick_filter_counts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    if (!is_quick_panel_open) return counts;
    const rows = config.default_groups.flatMap((group) => group.rows);
    for (const facet of filter_inputs.quick_filter_facets) {
      const matches = buildRowMatcher(config, derivation_state, filter_inputs, { exclude_facet_id: facet.id });
      const facet_counts: Record<string, number> = {};
      for (const row of rows) {
        if (!matches(row)) continue;
        // A subitem facet counts parents: each option once per parent holding it on any subitem.
        const option_ids =
          facet.scope === "subitem"
            ? new Set((config.getSubRows?.(row) ?? []).flatMap((sub_row) => facet.getOptionIds(sub_row, filter_inputs.filter_context)))
            : facet.getOptionIds(row, filter_inputs.filter_context);
        for (const option_id of option_ids) {
          facet_counts[option_id] = (facet_counts[option_id] ?? 0) + 1;
        }
      }
      counts[facet.id] = facet_counts;
    }
    return counts;
  }, [is_quick_panel_open, config, derivation_state, filter_inputs]);

  /** Person panel counts: rows per person given every other active filter. Only computed while the panel is open. */
  const is_person_panel_open = active_panel === "person";
  const person_counts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!is_person_panel_open) return counts;
    const matches = buildRowMatcher(config, derivation_state, filter_inputs, { exclude_person: true });
    const readPersonIds = buildPersonIdsReader(config, derivation_state, filter_inputs);
    for (const row of config.default_groups.flatMap((group) => group.rows)) {
      if (!matches(row)) continue;
      for (const person_id of new Set(readPersonIds(row))) counts[person_id] = (counts[person_id] ?? 0) + 1;
    }
    return counts;
  }, [is_person_panel_open, config, derivation_state, filter_inputs]);

  /**
   * Ctrl/Cmd+F jump-navigation targets: every (row, column) pair whose cell
   * text actually contains the query, across the rows `deriveBoardRows`
   * already narrowed down to matches above — this just identifies *which*
   * of each matching row's searched columns is the reason it matched, so a
   * board view can outline/scroll to one cell at a time instead of the whole
   * row (see the Table view's `active_search_match` bridge).
   */
  const search_matches = useMemo(() => {
    const query = search_query.trim().toLowerCase();
    if (!query) return [];
    const column_ids = search_column_ids.length ? search_column_ids : config.columns.map((c) => c.id);
    const matches: { row_id: string; column_id: string }[] = [];
    for (const group of derived.groups) {
      for (const row of group.rows) {
        const row_id = config.getRowId(row);
        for (const column_id of column_ids) {
          if (config.getColumnText(row, column_id).toLowerCase().includes(query)) matches.push({ row_id, column_id });
        }
      }
    }
    return matches;
  }, [derived.groups, search_query, search_column_ids, config]);

  const nextMatch = () => setActiveMatchIndex((i) => (search_matches.length ? (i + 1) % search_matches.length : 0));
  const prevMatch = () => setActiveMatchIndex((i) => (search_matches.length ? (i - 1 + search_matches.length) % search_matches.length : 0));

  return {
    ...config,
    filter_fields: active_filter_fields,
    active_panel,
    openPanel,
    closePanel,
    togglePanel,

    is_search_open,
    openSearch,
    closeSearch,
    is_search_focused,
    focusSearch,
    blurSearch,
    search_query,
    setSearchQuery,
    search_column_ids,
    toggleSearchColumnId,
    setAllSearchColumns,
    search_matches,
    active_match_index,
    nextMatch,
    prevMatch,
    search_include_subitems,
    setSearchIncludeSubitems,
    search_include_updates,
    setSearchIncludeUpdates,

    selected_person_ids,
    togglePersonId,
    clearPersonFilter,
    selected_team_ids,
    toggleTeamId,
    person_column_ids,
    setPersonColumnIds,
    person_counts,

    filter_context,
    quick_filter_facets,
    quick_filter_selections,
    quick_filter_counts,
    toggleQuickFilterOption,
    quick_filter_exclusions,
    toggleQuickFilterExclusion,
    selectOnlyQuickFilterOption,
    clearQuickFilterFacet,
    clearQuickFilters,
    quick_filter_column_ids,
    setQuickFilterColumnIds,

    filter_mode,
    setFilterMode,
    advanced_filter_rows,
    addAdvancedFilterRow,
    addAdvancedFilterRowForColumn,
    addAdvancedFilterRule,
    removeAdvancedFilterRow,
    updateAdvancedFilterRow,
    advanced_filter_operator,
    setAdvancedFilterOperator,
    advanced_filter_groups,
    addAdvancedFilterGroup,
    removeAdvancedFilterGroup,
    setAdvancedFilterGroupOperator,
    addAdvancedFilterGroupRule,
    updateAdvancedFilterGroupRule,
    removeAdvancedFilterGroupRule,
    duplicateAdvancedFilterRow,
    moveAdvancedFilterRow,
    duplicateAdvancedFilterGroupRule,
    moveAdvancedFilterGroupRule,
    convertQuickFiltersToAdvanced,
    can_convert_quick_filters,
    include_subitems,
    setIncludeSubitems,
    has_subitem_fields: subitem_field_ids.length > 0,
    clearAdvancedFilters,
    clearAllFilters,
    resetAllFilters,
    applyFilterState,

    sort_rules,
    addSortRule,
    removeSortRule,
    updateSortRule,
    moveSortRule,
    applySortRules,
    clearSort,
    setSingleSort,

    hidden_column_ids,
    toggleColumnHidden,
    showAllColumns,
    hideAllColumns,

    pinned_column_ids,
    togglePinnedColumn,
    unpinAllColumns,

    group_by_option_id,
    setGroupByOptionId,
    group_order_direction,
    setGroupOrderDirection,
    show_empty_groups,
    setShowEmptyGroups,

    row_height,
    setRowHeight,

    conditional_color_rules,
    addConditionalColorRule,
    removeConditionalColorRule,
    updateConditionalColorRule,
    clearConditionalColorRules,

    ...derived,
  };
}

export default useBoardToolbar;
