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
};

export type BoardSortDirection = "asc" | "desc";

export type BoardSortOption<TRow> = {
  id: string;
  label: string;
  getValue: (row: TRow) => string | number;
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
  /** Column badge shown next to the option in the Group-by column picker. Omit for the "default" option. */
  swatch?: BoardColumnSwatch;
};

export const BOARD_DEFAULT_GROUP_BY_ID = "default";

export type BoardQuickFilterFacetOption = {
  id: string;
  label: string;
  dot_color?: string;
  emoji?: string;
  person_id?: string;
};

export type BoardQuickFilterFacet<TRow> = {
  id: string;
  label: string;
  options: BoardQuickFilterFacetOption[];
  getOptionIds: (row: TRow) => string[];
};

export type BoardAdvancedFilterCondition = "equals" | "contains" | "is_empty" | "is_not_empty";

export const BOARD_ADVANCED_FILTER_CONDITIONS: { id: BoardAdvancedFilterCondition; label: string }[] = [
  { id: "equals", label: "Is" },
  { id: "contains", label: "Contains" },
  { id: "is_empty", label: "Is empty" },
  { id: "is_not_empty", label: "Is not empty" },
];

export type BoardAdvancedFilterRow = {
  id: string;
  column_id: string | null;
  condition: BoardAdvancedFilterCondition | null;
  value: string;
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
  sort_options: BoardSortOption<TRow>[];
  /** Must contain one entry with id {@link BOARD_DEFAULT_GROUP_BY_ID}. */
  group_by_options: BoardGroupByOption<TRow>[];
  quick_filter_facets: BoardQuickFilterFacet<TRow>[];
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

  selected_person_ids: string[];
  togglePersonId: (id: string) => void;
  clearPersonFilter: () => void;

  quick_filter_selections: Record<string, string[]>;
  toggleQuickFilterOption: (facet_id: string, option_id: string) => void;
  clearQuickFilters: () => void;

  filter_mode: BoardFilterMode;
  setFilterMode: (mode: BoardFilterMode) => void;
  advanced_filter_rows: BoardAdvancedFilterRow[];
  addAdvancedFilterRow: () => void;
  removeAdvancedFilterRow: (id: string) => void;
  updateAdvancedFilterRow: (id: string, patch: Partial<BoardAdvancedFilterRow>) => void;
  clearAdvancedFilters: () => void;
  clearAllFilters: () => void;

  sort_rules: BoardSortRule[];
  addSortRule: () => void;
  removeSortRule: (id: string) => void;
  updateSortRule: (id: string, patch: Partial<BoardSortRule>) => void;
  clearSort: () => void;

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
  active_filter_count: number;
  /** Row-id → color, for rules scoped to "row" (first match wins). */
  row_colors: Record<string, string>;
  /** Row-id → column-id → color, for rules scoped to "cell" (first match per column wins). */
  cell_colors: Record<string, Record<string, string>>;
};
