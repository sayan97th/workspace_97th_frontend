import type { BoardColumn, BoardColumnSwatch, BoardGroup, BoardRowHeight } from "../types";

export type { BoardColumnSwatch };

export type BoardPersonOption = {
  id: string;
  name: string;
  initials: string;
  /** Index into TeamAvatars' AVATAR_GRADIENTS palette, so chips match the row avatars. */
  avatar_seed: number;
  /** Renders a small guest badge on the person's avatar in picker popovers. */
  is_guest?: boolean;
  /** Real uploaded profile photo, when available — {@link PersonAvatar} prefers this over the initials-on-gradient fallback. */
  avatar_url?: string;
  /** The account was disabled or deleted. The person is still shown, faded, wherever they authored or were assigned something. */
  is_deactivated?: boolean;
};

export type BoardSortDirection = "asc" | "desc";

export type BoardSortOption<TRow> = {
  id: string;
  label: string;
  /** `null` marks an empty cell, which always sorts after every filled one regardless of direction. */
  getValue: (row: TRow) => string | number | null;
  swatch?: BoardColumnSwatch;
};

/** How a sort rule combines with the rule above it. Cosmetic only — rules always apply as sequential tie-breakers. */
export type BoardSortJoinOperator = "and" | "or";

export type BoardSortRule = {
  id: string;
  sort_option_id: string | null;
  direction: BoardSortDirection;
  join_operator: BoardSortJoinOperator;
};

export type BoardGroupByOption<TRow> = {
  id: string;
  label: string;
  /** Omit for the reserved "default" option, which reuses the board's authored groups. */
  getGroupKey?: (row: TRow) => string;
  getGroupLabel?: (key: string) => string;
  getGroupColor?: (key: string) => string;
  /** Orders the buckets (e.g. a Status column's option order, or a date bucket's first day). Defaults to the key itself. */
  getGroupSortValue?: (key: string) => string | number;
  /** Column badge shown next to the option in the Group-by column picker. Omit for the "default" option. */
  swatch?: BoardColumnSwatch;
};

/** Group key a Group-by option returns for a row with no value; always rendered as the last bucket. */
export const BOARD_EMPTY_GROUP_KEY = "none";

export const BOARD_DEFAULT_GROUP_BY_ID = "default";

export type BoardQuickFilterFacetOption = {
  id: string;
  label: string;
  dot_color?: string;
  emoji?: string;
  person_id?: string;
};

/**
 * Everything the filter engine needs besides the row itself: the viewer's own
 * person id (resolves the "Me" value) and today's date as `YYYY-MM-DD` (resolves
 * relative date values such as "This week"). Kept explicit so the same filter
 * state evaluates identically in the browser and on the API.
 */
export type BoardFilterContext = {
  today: string;
  current_person_id: string | null;
};

export type BoardQuickFilterFacet<TRow> = {
  id: string;
  label: string;
  swatch?: BoardColumnSwatch;
  options: BoardQuickFilterFacetOption[];
  /** For a `subitem` facet this reads one subitem, and a parent matches when any of its subitems does. */
  getOptionIds: (row: TRow, context: BoardFilterContext) => string[];
  scope: BoardFilterFieldScope;
};

/**
 * How a column's values are filtered. Each column type maps onto one family,
 * which decides the conditions offered, the value picker shown and how a rule
 * is evaluated (see `filterEngine.ts`).
 */
export type BoardFilterFieldKind = "option" | "people" | "group" | "text" | "number" | "date" | "checkbox";

/** A filterable column (or virtual field such as Group or Name) the caller describes to the toolbar. */
export type BoardFilterField<TRow> = {
  id: string;
  label: string;
  kind: BoardFilterFieldKind;
  swatch?: BoardColumnSwatch;
  /** Selectable values for `option`/`people`/`group` fields, and fixed buckets for a `number` field such as Rating. */
  options?: BoardQuickFilterFacetOption[];
  /** Display text, used by text conditions and as a fallback for rules saved before typed conditions existed. */
  getText: (row: TRow) => string;
  /** `option`/`people`/`group` fields: the ids of every value the row holds. */
  getOptionIds?: (row: TRow) => string[];
  /** `number` fields: the numeric value, or null when empty. */
  getNumber?: (row: TRow) => number | null;
  /** `date` fields: the covered day range as `YYYY-MM-DD` (start equals end for a single date), or null when empty. */
  getDateRange?: (row: TRow) => { start: string; end: string } | null;
  /** `checkbox` fields: whether the box is ticked. */
  getChecked?: (row: TRow) => boolean;
  /** Whether the field is offered as a Quick filters facet. Defaults to true for every kind except `text`. */
  is_quick_filterable?: boolean;
  /**
   * `subitem` fields read a subitem's own column, and only apply while "Filter
   * subitems" is on. A parent row matches when one of its subitems does, and
   * only the matching subitems stay visible beneath it. Defaults to `item`.
   */
  scope?: BoardFilterFieldScope;
  /** Picker section the field is listed under, e.g. "Item details" for Created by or Last updated. */
  section?: string;
};

export type BoardFilterFieldScope = "item" | "subitem";

/** Every condition a filter rule can use. Which ones a column offers depends on its {@link BoardFilterFieldKind}. */
export type BoardFilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_or_equal"
  | "less_than"
  | "less_or_equal"
  | "between"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "is_checked"
  | "is_unchecked"
  | "is_empty"
  | "is_not_empty";

/** The four text conditions Conditional coloring still uses. Also valid filter operators, so views saved before typed conditions keep working. */
export type BoardAdvancedFilterCondition = "equals" | "contains" | "is_empty" | "is_not_empty";

export const BOARD_ADVANCED_FILTER_CONDITIONS: { id: BoardAdvancedFilterCondition; label: string }[] = [
  { id: "equals", label: "Is" },
  { id: "contains", label: "Contains" },
  { id: "is_empty", label: "Is empty" },
  { id: "is_not_empty", label: "Is not empty" },
];

export type BoardFilterJoinOperator = "and" | "or";

export type BoardAdvancedFilterRow = {
  id: string;
  column_id: string | null;
  condition: BoardFilterOperator | null;
  /** Single value: text, a number, or a date (`YYYY-MM-DD` or a relative preset id such as `this_week`). */
  value: string;
  /** Multi value: option/person/group ids, or the two bounds of a `between` rule. */
  values?: string[];
  /** A paused rule stays in the list but narrows nothing, so it can be switched back on later without rebuilding it. */
  is_disabled?: boolean;
};

/** A nested set of rules combined with its own And/Or, like monday's "New group" in Advanced filters. */
export type BoardAdvancedFilterGroup = {
  id: string;
  join_operator: BoardFilterJoinOperator;
  rules: BoardAdvancedFilterRow[];
};

/** The serializable filter slice of the toolbar, as a saved view or a shared URL stores it. */
export type BoardToolbarFilterState = {
  search_query: string;
  search_column_ids: string[];
  selected_person_ids: string[];
  quick_filter_selections: Record<string, string[]>;
  advanced_filter_rows: BoardAdvancedFilterRow[];
  advanced_filter_groups?: BoardAdvancedFilterGroup[];
  advanced_filter_operator?: BoardFilterJoinOperator;
  /** Which fields show as Quick filters facets. `null` (or omitted) shows every eligible field. */
  quick_filter_column_ids?: string[] | null;
  /** Facet id to the option ids a row must NOT hold ("Status is not Done"), picked with Alt+click or the option's Exclude button. */
  quick_filter_exclusions?: Record<string, string[]>;
  /** "Filter subitems": subitem columns become filterable and a parent shows when one of its subitems matches. */
  include_subitems?: boolean;
  /** Which People columns the Person filter looks at. `null` (or omitted) means every People column. */
  person_column_ids?: string[] | null;
  /** Teams picked in the Person filter. A row matches when any member of a picked team is assigned. */
  selected_team_ids?: string[];
  /** Search also matches subitem names and values. */
  search_include_subitems?: boolean;
  /** Search also matches the text of updates (comments) posted on an item or its subitems. */
  search_include_updates?: boolean;
};

/** Wires the "..." menu's "Export visible items". Omit to hide it. */
export type BoardToolbarExportOptions = {
  /** Used in the file name and the Excel sheet name. */
  board_name: string;
  /** Whether every row is loaded, so an export holds the whole filtered board and not just the tables loaded so far. */
  is_ready: boolean;
  /** Starts loading whatever rows are still missing. Called when the "..." menu opens. */
  onPrepare: () => void;
};

/** A personal, named filter the viewer saved for this board. Private to them and independent from the shared views. */
export type BoardSavedFilter = {
  id: number;
  name: string;
  filter_state: BoardToolbarFilterState;
};

/** What the Filter panel's "Saved filters" menu does, wired by the board that stores them. Omit to hide the menu. */
export type BoardSavedFilterActions = {
  saved_filters: BoardSavedFilter[];
  saveCurrentFilter: (name: string) => Promise<void>;
  renameSavedFilter: (id: number, name: string) => Promise<void>;
  deleteSavedFilter: (id: number) => Promise<void>;
};

/** An account team the Person filter can pick, with the ids of its members who can see the board. */
export type BoardTeamOption = {
  id: string;
  name: string;
  member_ids: string[];
};

/** What "Save as new view"/"Save to this view" do, wired by the board that owns the saved views. Omit to hide those buttons. */
export type BoardToolbarViewActions = {
  can_save: boolean;
  is_dirty: boolean;
  active_view_label: string | null;
  saveToActiveView: () => Promise<void>;
  saveAsNewView: () => Promise<void>;
  /** Whether the toolbar is showing the viewer's remembered (unsaved) changes rather than the view as saved. */
  has_personal_state?: boolean;
  /** Drops the viewer's remembered changes and replays the view as saved. */
  resetToView?: () => void;
};

export type BoardToolbarPanelId =
  | "search_columns"
  | "person"
  | "filter"
  | "sort"
  | "hide"
  | "pin"
  | "group"
  | "overflow"
  | "color";

/** Where a matching conditional-coloring rule paints its color: the whole row, or just the matched column's cell. */
export type BoardConditionalColorScope = "row" | "cell";

export const BOARD_CONDITIONAL_COLOR_SCOPES: { id: BoardConditionalColorScope; label: string }[] = [
  { id: "row", label: "Row" },
  { id: "cell", label: "Cell" },
];

/** Monday-style swatch grid offered by the conditional-coloring color picker. */
export const BOARD_CONDITIONAL_COLOR_PALETTE: string[] = [
  "#7f5347", "#037f4c", "#00c875", "#9cd326", "#cab641", "#e2a200",
  "#b25e03", "#a25ddc", "#784bd1", "#5559df", "#0086c0", "#579bfc",
  "#66ccff", "#e2445c", "#ff158a", "#ff5ac4", "#ff642e", "#fdab3d",
  "#ffcb00", "#333333", "#808080", "#c4c4c4", "#66cccc", "#4eccc6",
  "#bb3354", "#401694", "#0f5d97", "#225091", "#175a63", "#563e3e",
];

/** One "paint this row/cell when a column matches a condition" rule, evaluated top to bottom. */
export type BoardConditionalColorRule = {
  id: string;
  color: string;
  scope: BoardConditionalColorScope;
  column_id: string | null;
  condition: BoardAdvancedFilterCondition | null;
  value: string;
};

export type BoardFilterMode = "quick" | "advanced";

/** Board-specific configuration a caller supplies to {@link useBoardToolbar}. */
export type BoardToolbarConfig<TRow> = {
  columns: BoardColumn[];
  default_groups: BoardGroup<TRow>[];
  getRowId: (row: TRow) => string;
  /** Renders a row's value for a given column id, powering Advanced Filters and column-scoped Search. */
  getColumnText: (row: TRow, column_id: string) => string;
  persons: BoardPersonOption[];
  getPersonIds: (row: TRow) => string[];
  /** The viewer's own person id, which the "Me" filter value resolves to. */
  current_person_id: string | null;
  sort_options: BoardSortOption<TRow>[];
  /** Must contain one entry with id {@link BOARD_DEFAULT_GROUP_BY_ID}. */
  group_by_options: BoardGroupByOption<TRow>[];
  /** Filterable fields, in picker order. Advanced filters and Quick filters facets are both built from these. */
  filter_fields: BoardFilterField<TRow>[];
  /** A row's subitems, which "Filter subitems" and "Search in subitems" look at. Omit on boards without subitems. */
  getSubRows?: (row: TRow) => TRow[];
  /** Column ids searched on a subitem when "Search in subitems" is on, including the name column. */
  subitem_search_column_ids?: string[];
  /** The ids of the filter fields (People columns) the Person filter can look at, in picker order. Defaults to none, which falls back to `getPersonIds`. */
  person_field_ids?: string[];
  /** Teams offered by the Person filter. */
  teams?: BoardTeamOption[];
  /** Ids of rows whose updates (comments) match the current search, looked up by the caller. Only used while "Search in updates" is on. */
  update_match_row_ids?: Set<string> | null;
  /** Whether the caller looks up `update_match_row_ids`, which offers "Search in updates". */
  can_search_updates?: boolean;
  /** Browser storage key for this board's recent searches. Omit to not remember them. */
  recent_search_storage_key?: string;
  /** A cell's text in an export. Defaults to `getColumnText`, override it for values computed while rendering (formulas). */
  getExportText?: (row: TRow, column_id: string) => string;
};

/** Full live state + actions + derived render output returned by {@link useBoardToolbar}. */
export type BoardToolbarApi<TRow> = BoardToolbarConfig<TRow> & {
  active_panel: BoardToolbarPanelId | null;
  openPanel: (id: BoardToolbarPanelId) => void;
  closePanel: () => void;
  togglePanel: (id: BoardToolbarPanelId) => void;

  is_search_open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  /** Whether the search input currently has focus; drives the compact/expanded input width. */
  is_search_focused: boolean;
  focusSearch: () => void;
  blurSearch: () => void;
  search_query: string;
  setSearchQuery: (value: string) => void;
  search_column_ids: string[];
  toggleSearchColumnId: (column_id: string) => void;
  setAllSearchColumns: (selected: boolean) => void;
  /** Ctrl/Cmd+F jump-navigation targets, see `useBoardToolbar`'s own doc comment on the memo that builds this. Empty while `search_query` is blank. */
  search_matches: { row_id: string; column_id: string }[];
  /** Index into `search_matches` the "N of M" counter and active outline/scroll point at. */
  active_match_index: number;
  nextMatch: () => void;
  prevMatch: () => void;

  search_include_subitems: boolean;
  setSearchIncludeSubitems: (value: boolean) => void;
  search_include_updates: boolean;
  setSearchIncludeUpdates: (value: boolean) => void;

  selected_person_ids: string[];
  togglePersonId: (id: string) => void;
  clearPersonFilter: () => void;
  selected_team_ids: string[];
  toggleTeamId: (id: string) => void;
  /** Which People columns the Person filter looks at, `null` for all of them. */
  person_column_ids: string[] | null;
  setPersonColumnIds: (ids: string[] | null) => void;
  /** Person id to matching row count given every other active filter. Empty while the Person panel is closed. */
  person_counts: Record<string, number>;

  /** Today's date and the viewer's id, shared by every filter evaluation (and sent to the API for server-side filtering). */
  filter_context: BoardFilterContext;
  /** Quick filters facets derived from `filter_fields`, including the ones the viewer chose to hide. */
  quick_filter_facets: BoardQuickFilterFacet<TRow>[];
  quick_filter_selections: Record<string, string[]>;
  /** Facet id to option id to matching row count, given every other active filter. Empty while the Quick filters panel is closed. */
  quick_filter_counts: Record<string, Record<string, number>>;
  toggleQuickFilterOption: (facet_id: string, option_id: string) => void;
  quick_filter_exclusions: Record<string, string[]>;
  /** Adds or removes an option from the facet's exclusions (and from its picks, since a value can't be both). */
  toggleQuickFilterExclusion: (facet_id: string, option_id: string) => void;
  /** "Only": picks just this option in the facet, dropping every other pick and exclusion there. */
  selectOnlyQuickFilterOption: (facet_id: string, option_id: string) => void;
  clearQuickFilterFacet: (facet_id: string) => void;
  clearQuickFilters: () => void;
  quick_filter_column_ids: string[] | null;
  setQuickFilterColumnIds: (ids: string[] | null) => void;

  filter_mode: BoardFilterMode;
  setFilterMode: (mode: BoardFilterMode) => void;
  advanced_filter_rows: BoardAdvancedFilterRow[];
  addAdvancedFilterRow: () => void;
  /** Same as {@link addAdvancedFilterRow}, but pre-selects `column_id` (and that column's first condition). The column-header menu's "Filter" row uses this to open Advanced Filters with the clicked column ready to configure. */
  addAdvancedFilterRowForColumn: (column_id: string) => void;
  /** Appends a fully configured rule, e.g. from a cell's "Filter by this value". */
  addAdvancedFilterRule: (rule: Omit<BoardAdvancedFilterRow, "id">) => void;
  removeAdvancedFilterRow: (id: string) => void;
  updateAdvancedFilterRow: (id: string, patch: Partial<BoardAdvancedFilterRow>) => void;
  advanced_filter_operator: BoardFilterJoinOperator;
  setAdvancedFilterOperator: (operator: BoardFilterJoinOperator) => void;
  advanced_filter_groups: BoardAdvancedFilterGroup[];
  addAdvancedFilterGroup: () => void;
  removeAdvancedFilterGroup: (group_id: string) => void;
  setAdvancedFilterGroupOperator: (group_id: string, operator: BoardFilterJoinOperator) => void;
  addAdvancedFilterGroupRule: (group_id: string) => void;
  updateAdvancedFilterGroupRule: (group_id: string, rule_id: string, patch: Partial<BoardAdvancedFilterRow>) => void;
  removeAdvancedFilterGroupRule: (group_id: string, rule_id: string) => void;
  duplicateAdvancedFilterRow: (id: string) => void;
  moveAdvancedFilterRow: (active_id: string, over_id: string) => void;
  duplicateAdvancedFilterGroupRule: (group_id: string, rule_id: string) => void;
  moveAdvancedFilterGroupRule: (group_id: string, active_id: string, over_id: string) => void;
  /**
   * Turns every Quick filters pick and exclusion into equivalent Advanced rules,
   * then clears Quick filters and opens Advanced. Only possible while the
   * top-level Advanced operator is And (or nothing is there yet), since Quick
   * and Advanced filters always combine with And.
   */
  convertQuickFiltersToAdvanced: () => void;
  can_convert_quick_filters: boolean;
  include_subitems: boolean;
  setIncludeSubitems: (value: boolean) => void;
  /** Whether the board has subitem columns at all, which decides whether "Filter subitems" is offered. */
  has_subitem_fields: boolean;
  clearAdvancedFilters: () => void;
  /** Clears Quick and Advanced filters (the Filter panel's own "Clear all"). */
  clearAllFilters: () => void;
  /** Clears every row-narrowing control: Quick and Advanced filters, Person and Search. */
  resetAllFilters: () => void;
  /** Replaces the whole filter slice at once (saved view, shared URL), with fresh local rule ids. */
  applyFilterState: (filter_state: BoardToolbarFilterState) => void;

  sort_rules: BoardSortRule[];
  addSortRule: () => void;
  removeSortRule: (id: string) => void;
  updateSortRule: (id: string, patch: Partial<BoardSortRule>) => void;
  /** Moves the rule `active_id` to where `over_id` sits (the Sort panel's drag and drop). */
  moveSortRule: (active_id: string, over_id: string) => void;
  /** Replaces every sort rule at once (shared URL), with fresh local rule ids. */
  applySortRules: (rules: Omit<BoardSortRule, "id">[]) => void;
  clearSort: () => void;
  /** Replaces `sort_rules` with a single rule for `column_id`/`direction`, or clears it when either is null — see the grid's column-header sort arrow bridge in `TableBoardView.tsx`. */
  setSingleSort: (column_id: string | null, direction: BoardSortDirection | null) => void;

  hidden_column_ids: string[];
  toggleColumnHidden: (id: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;

  pinned_column_ids: string[];
  togglePinnedColumn: (id: string) => void;
  unpinAllColumns: () => void;

  group_by_option_id: string;
  setGroupByOptionId: (id: string) => void;
  group_order_direction: BoardSortDirection;
  setGroupOrderDirection: (direction: BoardSortDirection) => void;
  show_empty_groups: boolean;
  setShowEmptyGroups: (value: boolean) => void;

  row_height: BoardRowHeight;
  setRowHeight: (height: BoardRowHeight) => void;

  conditional_color_rules: BoardConditionalColorRule[];
  addConditionalColorRule: () => void;
  removeConditionalColorRule: (id: string) => void;
  updateConditionalColorRule: (id: string, patch: Partial<BoardConditionalColorRule>) => void;
  clearConditionalColorRules: () => void;

  // derived (memoized)
  visible_columns: BoardColumn[];
  groups: BoardGroup<TRow>[];
  total_row_count: number;
  visible_row_count: number;
  /** Complete Advanced filter rules plus selected Quick filter options. Person and Search are counted by their own controls. */
  active_filter_count: number;
  /** Root row id to the ids of its subitems that match the subitem filters. Null while no subitem filter applies, so every subitem shows. */
  visible_subitem_ids: Record<string, string[]> | null;
  /** Row-id → color, for rules scoped to "row" (first match wins). */
  row_colors: Record<string, string>;
  /** Row-id → column-id → color, for rules scoped to "cell" (first match per column wins). */
  cell_colors: Record<string, Record<string, string>>;
};
