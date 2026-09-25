"use client";
import { useEffect, useRef, useState } from "react";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  getBoardViewTypeOption,
  type BoardAdvancedFilterGroup,
  type BoardAdvancedFilterRow,
  type BoardConditionalColorRule,
  type BoardFilterJoinOperator,
  type BoardRowHeight,
  type BoardSortRule,
  type BoardToolbarFilterState,
  type BoardViewKind,
  type BoardViewTabItem,
} from "@/components/board";
import { boardContentService } from "@/services/board-content.service";
import type { BoardFilterState, BoardViewDto, SaveBoardViewPayload } from "@/types/board-content";

/**
 * Sorts a board's non-primary views for display. When the viewer has a saved
 * "Reorder (for you only)" order, it wins outright — any view id missing
 * from it (created after the order was last saved) is appended at the end in
 * its normal position order. Otherwise, pinned views sort ahead of unpinned
 * ones, each group by `position`.
 */
function sortSecondaryViews(views: BoardViewDto[], personal_order: number[] | null): BoardViewDto[] {
  const by_position = views.slice().sort((a, b) => a.position - b.position);
  if (!personal_order) {
    return by_position.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }

  const rank = new Map(personal_order.map((id, index) => [id, index]));
  const ordered = by_position.filter((v) => rank.has(v.id));
  const unordered = by_position.filter((v) => !rank.has(v.id));
  ordered.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return [...ordered, ...unordered];
}

/**
 * A saved `filter_state` blob's `quick_filter_selections` may come back as `[]`
 * instead of `{}` — an empty PHP array json-encodes as a list, not an object,
 * so an empty map round-trips through the API as `[]`. Normalize it back to an
 * object so it doesn't perpetually read as "different from the toolbar's `{}`".
 *
 * `search_query` can likewise come back as `null` — views saved before the
 * search box was ever touched store the column as `null` rather than `""`.
 */
const EMPTY_FILTER_STATE: BoardFilterState = {
  search_query: "",
  search_column_ids: [],
  selected_person_ids: [],
  quick_filter_selections: {},
  advanced_filter_rows: [],
  advanced_filter_groups: [],
  advanced_filter_operator: "and",
  quick_filter_column_ids: null,
};

/**
 * A saved rule's `value` can likewise come back as `null` (same root cause as
 * `search_query` above). Every filter and coloring rule is evaluated on a
 * trimmed string, so any rule replayed onto the toolbar needs the empty-string
 * default restored.
 */
const withDefaultValues = <T extends { value: string }>(rows: T[]): T[] =>
  rows.map((row) => ({ ...row, value: row.value ?? "" }));

/** Filter rules also get `values: []` back when a view saved before multi-value rules existed omits it. */
const normalizeRules = (rules: BoardAdvancedFilterRow[]): BoardAdvancedFilterRow[] =>
  withDefaultValues(rules).map((rule) => ({ ...rule, values: rule.values ?? [] }));

const normalizeFilterState = (filter_state: BoardFilterState | null): BoardFilterState => {
  const base = filter_state ?? EMPTY_FILTER_STATE;
  return {
    ...base,
    search_query: base.search_query ?? "",
    search_column_ids: base.search_column_ids ?? [],
    selected_person_ids: base.selected_person_ids ?? [],
    quick_filter_selections:
      !base.quick_filter_selections || Array.isArray(base.quick_filter_selections) ? {} : base.quick_filter_selections,
    advanced_filter_rows: normalizeRules(base.advanced_filter_rows ?? []),
    advanced_filter_groups: (base.advanced_filter_groups ?? []).map((group) => ({
      ...group,
      join_operator: group.join_operator === "or" ? "or" : "and",
      rules: normalizeRules(group.rules ?? []),
    })),
    advanced_filter_operator: base.advanced_filter_operator === "or" ? "or" : "and",
    quick_filter_column_ids: base.quick_filter_column_ids ?? null,
  };
};

/**
 * The filter slice as the dirty check compares it: local rule and group ids
 * (React keys, regenerated on every replay) are stripped at every level.
 */
const comparableFilterState = (filter_state: BoardFilterState) => ({
  ...filter_state,
  advanced_filter_rows: withoutIds(filter_state.advanced_filter_rows),
  advanced_filter_groups: (filter_state.advanced_filter_groups ?? []).map((group) => ({
    join_operator: group.join_operator,
    rules: withoutIds(group.rules),
  })),
});

/**
 * `JSON.stringify` on a plain object serializes keys in insertion order, but
 * MySQL's native `JSON` column type doesn't guarantee that order survives a
 * round-trip — a saved view's `filter_state` can come back with its keys in a
 * different order than it went in. Sorting keys at every level before
 * stringifying makes the dirty-check compare data, not incidental key order.
 * Array element order is left untouched — it's meaningful there (row order).
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const withoutIds = <T extends { id: string }>(rows: T[]): Omit<T, "id">[] => rows.map(({ id: _id, ...rest }) => rest);

/** Appends " 2", " 3", … to `base` until it no longer collides with an existing tab's label. */
function dedupeLabel(base: string, views: BoardViewDto[]): string {
  const taken = new Set(views.map((v) => v.label));
  if (!taken.has(base)) return base;
  let attempt = 2;
  while (taken.has(`${base} ${attempt}`)) attempt += 1;
  return `${base} ${attempt}`;
}

/**
 * The subset of {@link import("@/components/board").useBoardToolbar}'s return
 * value {@link useBoardViewTabs} drives — a saved view is replayed onto the
 * toolbar, and the toolbar's live state is compared back against it for the
 * "save changes to this view" dirty check. Deliberately not generic over the
 * board's row type: none of these fields depend on it.
 */
export type BoardViewSyncToolbar = {
  search_query: string;
  search_column_ids: string[];
  selected_person_ids: string[];
  quick_filter_selections: Record<string, string[]>;
  quick_filter_column_ids: string[] | null;
  advanced_filter_rows: BoardAdvancedFilterRow[];
  advanced_filter_groups: BoardAdvancedFilterGroup[];
  advanced_filter_operator: BoardFilterJoinOperator;
  sort_rules: BoardSortRule[];
  conditional_color_rules: BoardConditionalColorRule[];
  hidden_column_ids: string[];
  pinned_column_ids: string[];
  row_height: BoardRowHeight;
  group_by_option_id: string;

  applyFilterState: (filter_state: BoardToolbarFilterState) => void;
  applySortRules: (rules: Omit<BoardSortRule, "id">[]) => void;
  showAllColumns: () => void;
  toggleColumnHidden: (id: string) => void;
  unpinAllColumns: () => void;
  togglePinnedColumn: (id: string) => void;
  setRowHeight: (height: BoardRowHeight) => void;
  clearConditionalColorRules: () => void;
  addConditionalColorRule: () => void;
  updateConditionalColorRule: (id: string, patch: Partial<BoardConditionalColorRule>) => void;
  setGroupByOptionId: (id: string) => void;
};

export type UseBoardViewTabsConfig = {
  board_id: number;
  initial_views: BoardViewDto[];
  /** Deep-link support — selects this tab instead of the primary one on mount. */
  initial_active_view_id?: number | null;
  /** The viewer's saved "Reorder (for you only)" tab order, if they have one. */
  initial_personal_order?: number[] | null;
  toolbar: BoardViewSyncToolbar;
  /** Called right after a tab becomes active — e.g. to push `/boards/{id}/views/{id}`. Most boards don't have view-scoped URLs, so this is optional. */
  onViewActivated?: (view: BoardViewDto) => void;
};

export type UseBoardViewTabsApi = {
  views: BoardViewDto[];
  active_view_id: number | null;
  active_view: BoardViewDto | null;
  /** Ready for `<BoardViewTabs tabs={...} .../>`, sorted primary-first then pinned/personal order. */
  tabs: BoardViewTabItem[];
  /** Whether the toolbar's live state has diverged from the active view's saved state. */
  is_dirty: boolean;
  /** Whether the active view's saved state has finished replaying onto the toolbar (the dirty check is only meaningful after that). */
  is_view_applied: boolean;
  /** The toolbar's live filter slice, as a view saves it. */
  current_filter_state: BoardFilterState;
  selectView: (id: number | string) => void;
  /** Creates a new tab, defaulting to a plain table when no kind is given (see `BoardViewTabs`'s "+" picker). */
  addView: (view_type?: BoardViewKind) => Promise<BoardViewDto>;
  renameView: (id: number, label: string) => Promise<void>;
  changeViewEmoji: (id: number, emoji: string | null) => Promise<void>;
  /** Saves a `doc`-type view's markdown — the Doc tab's autosave calls this directly (not `saveActiveView`, which is the filter/sort "save this view" action). */
  updateDocContent: (id: number, doc_content: string) => Promise<void>;
  deleteView: (id: number) => Promise<void>;
  saveActiveView: () => Promise<void>;
  /** "Save as new view": copies the active tab (columns, groups, items) into a new tab holding the toolbar's live state, then opens it. */
  saveAsNewView: () => Promise<BoardViewDto | null>;
  duplicateView: (id: number) => Promise<BoardViewDto>;
  pinView: (id: number) => Promise<void>;
  lockView: (id: number) => Promise<void>;
  /** Saves the viewer's own tab order — does not affect other collaborators. */
  reorderPersonalTabs: (ordered_ids: Array<number | string>) => Promise<void>;
};

/**
 * Drives a board's tabs: switching between saved views replays each one's
 * filter/sort/hidden-column/group-by state onto the toolbar (so a tab shows
 * genuinely different content, not just a different label), tracks whether
 * the toolbar has since drifted from what's saved, and wraps the
 * rename/emoji/add/delete/save mutations against `boards/{board_id}/views`.
 *
 * Used by `TableBoardView`, the generic, DB-backed board engine every board
 * (including Client Hub) renders through — it composes `useBoardToolbar`
 * from `@/components/board`, so this hook only needs the
 * {@link BoardViewSyncToolbar} slice of it.
 */
export function useBoardViewTabs(config: UseBoardViewTabsConfig): UseBoardViewTabsApi {
  const { board_id, initial_views, initial_active_view_id, initial_personal_order, toolbar, onViewActivated } =
    config;

  const [views, setViews] = useState(initial_views);
  const [personal_order, setPersonalOrder] = useState<number[] | null>(initial_personal_order ?? null);
  const [active_view_id, setActiveViewId] = useState<number | null>(
    initial_active_view_id ?? initial_views.find((v) => v.is_primary)?.id ?? initial_views[0]?.id ?? null
  );
  const [applied_view_id, setAppliedViewId] = useState<number | null>(null);

  const toolbar_ref = useRef(toolbar);
  toolbar_ref.current = toolbar;

  // ── Apply the active view's saved filter/sort/display state to the toolbar ──
  //
  // Filters and sort rules are replaced in one call each (with fresh local
  // ids). Conditional-coloring rules still go through two phases, because
  // `addConditionalColorRule` generates its own id for each row: phase 1
  // resets the toolbar and adds one blank placeholder per saved rule, phase 2
  // waits for those placeholders to show up in `toolbar`'s state, then fills
  // each one in by position using its real generated id.
  const [pending_view, setPendingView] = useState<BoardViewDto | null>(null);

  useEffect(() => {
    const view = views.find((v) => v.id === active_view_id);
    if (!view) return;

    const t = toolbar_ref.current;
    t.applyFilterState(normalizeFilterState(view.filter_state));
    t.applySortRules(view.sort_state ?? []);
    t.showAllColumns();
    (view.hidden_column_ids ?? []).forEach((id) => t.toggleColumnHidden(id));
    t.unpinAllColumns();
    (view.pinned_column_ids ?? []).forEach((id) => t.togglePinnedColumn(id));
    t.setRowHeight(view.row_height);
    t.clearConditionalColorRules();
    (view.conditional_color_rules ?? []).forEach(() => t.addConditionalColorRule());
    t.setGroupByOptionId(view.group_by_option_id ?? BOARD_DEFAULT_GROUP_BY_ID);

    setAppliedViewId(null);
    setPendingView(view);
    // Deliberately only re-runs when the active view id changes, replaying the
    // saved state onto the toolbar once per tab switch, not on every toolbar edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active_view_id]);

  useEffect(() => {
    if (!pending_view) return;
    const t = toolbar_ref.current;
    const wanted_colors = withDefaultValues(pending_view.conditional_color_rules ?? []);

    // Not all placeholder rows have landed in toolbar state yet, wait for the render where they have.
    if (t.conditional_color_rules.length !== wanted_colors.length) return;

    wanted_colors.forEach((rule, index) => {
      const actual_id = t.conditional_color_rules[index]?.id;
      if (actual_id) t.updateConditionalColorRule(actual_id, rule);
    });

    setAppliedViewId(pending_view.id);
    setPendingView(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending_view, toolbar.conditional_color_rules.length]);

  // ── "Save changes to this view" dirty check ──
  const active_view = views.find((v) => v.id === active_view_id) ?? null;
  const is_view_applied = applied_view_id === active_view_id;
  const current_filter_state: BoardFilterState = {
    search_query: toolbar.search_query,
    search_column_ids: toolbar.search_column_ids,
    selected_person_ids: toolbar.selected_person_ids,
    quick_filter_selections: toolbar.quick_filter_selections,
    advanced_filter_rows: toolbar.advanced_filter_rows,
    advanced_filter_groups: toolbar.advanced_filter_groups,
    advanced_filter_operator: toolbar.advanced_filter_operator,
    quick_filter_column_ids: toolbar.quick_filter_column_ids,
  };
  // `id` on advanced-filter/sort/color rows is a local React-key concern, freshly
  // generated every time a view is replayed onto the toolbar — it never matches
  // the saved blob's ids even when the rule itself is unchanged, so it's stripped
  // before comparing (otherwise every view with a saved rule would always read
  // as dirty, even right after loading it).
  const is_dirty =
    is_view_applied &&
    active_view !== null &&
    stableStringify({
      filter_state: comparableFilterState(normalizeFilterState(current_filter_state)),
      sort_state: withoutIds(toolbar.sort_rules),
      hidden_column_ids: toolbar.hidden_column_ids,
      pinned_column_ids: toolbar.pinned_column_ids,
      row_height: toolbar.row_height,
      conditional_color_rules: withoutIds(toolbar.conditional_color_rules),
      group_by_option_id: toolbar.group_by_option_id,
    }) !==
      stableStringify({
        filter_state: comparableFilterState(normalizeFilterState(active_view.filter_state)),
        sort_state: withoutIds(active_view.sort_state ?? []),
        hidden_column_ids: active_view.hidden_column_ids ?? [],
        pinned_column_ids: active_view.pinned_column_ids ?? [],
        row_height: active_view.row_height,
        conditional_color_rules: withoutIds(withDefaultValues(active_view.conditional_color_rules ?? [])),
        group_by_option_id: active_view.group_by_option_id ?? BOARD_DEFAULT_GROUP_BY_ID,
      });

  const buildSavedState = () => ({
    filter_state: current_filter_state,
    sort_state: toolbar.sort_rules,
    hidden_column_ids: toolbar.hidden_column_ids,
    pinned_column_ids: toolbar.pinned_column_ids,
    conditional_color_rules: toolbar.conditional_color_rules,
    row_height: toolbar.row_height,
    group_by_option_id: toolbar.group_by_option_id,
  });

  const saveActiveView = async () => {
    if (!active_view) return;
    const saved = await boardContentService.saveView(board_id, active_view.id, buildSavedState());
    setViews((current) => current.map((v) => (v.id === saved.id ? saved : v)));
  };

  const saveAsNewView = async (): Promise<BoardViewDto | null> => {
    if (!active_view) return null;
    const created = await boardContentService.duplicateView(board_id, active_view.id, {
      label: dedupeLabel(`${active_view.label} (filtered)`, views),
      ...buildSavedState(),
    });
    setViews((current) => [...current, created]);
    setActiveViewId(created.id);
    onViewActivated?.(created);
    return created;
  };

  // ── Tabs ── primary first, then pinned/personal-order among the rest (see `sortSecondaryViews`).
  const primary_views = views.filter((v) => v.is_primary);
  const secondary_views = sortSecondaryViews(
    views.filter((v) => !v.is_primary),
    personal_order
  );
  const tabs: BoardViewTabItem[] = [...primary_views, ...secondary_views].map((v) => ({
    id: v.id,
    label: v.label,
    emoji: v.emoji,
    pinned: v.pinned,
    is_locked: v.is_locked,
  }));

  const selectView = (id: number | string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    setActiveViewId(view.id);
    onViewActivated?.(view);
  };

  const addView = async (view_type?: BoardViewKind): Promise<BoardViewDto> => {
    // Plain "table" (or omitted) keeps the historical "View N" label; any
    // other kind is labeled after itself (e.g. "Kanban"), de-duplicated
    // against tabs already carrying that label.
    const label =
      !view_type || view_type === "table"
        ? `View ${views.length + 1}`
        : dedupeLabel(getBoardViewTypeOption(view_type).label, views);
    const created = await boardContentService.createView(board_id, { label, view_type });
    setViews((current) => [...current, created]);
    setActiveViewId(created.id);
    onViewActivated?.(created);
    return created;
  };

  const patchView = async (id: number, payload: SaveBoardViewPayload) => {
    const saved = await boardContentService.saveView(board_id, id, payload);
    setViews((current) => current.map((v) => (v.id === saved.id ? saved : v)));
  };

  const renameView = (id: number, label: string) => patchView(id, { label });
  const changeViewEmoji = (id: number, emoji: string | null) => patchView(id, { emoji });
  const updateDocContent = (id: number, doc_content: string) => patchView(id, { doc_content });

  const deleteView = async (id: number) => {
    await boardContentService.deleteView(board_id, id);
    // Side effects (setActiveViewId, onViewActivated's router navigation) are
    // deliberately kept out of the `setViews` updater — React can invoke a
    // functional updater during render, and calling another component's
    // setState (the router) from in there trips "Cannot update a component
    // while rendering a different component". `views` here is just the
    // closure's current snapshot, which is fine for a one-off event handler.
    const remaining = views.filter((v) => v.id !== id);
    setViews(remaining);
    if (active_view_id === id) {
      const next_active = remaining.find((v) => v.is_primary) ?? remaining[0] ?? null;
      setActiveViewId(next_active?.id ?? null);
      if (next_active) onViewActivated?.(next_active);
    }
  };

  const duplicateView = async (id: number): Promise<BoardViewDto> => {
    const created = await boardContentService.duplicateView(board_id, id);
    setViews((current) => [...current, created]);
    setActiveViewId(created.id);
    onViewActivated?.(created);
    return created;
  };

  const pinView = async (id: number) => {
    const saved = await boardContentService.togglePinView(board_id, id);
    setViews((current) => current.map((v) => (v.id === saved.id ? saved : v)));
  };

  const lockView = async (id: number) => {
    const saved = await boardContentService.toggleLockView(board_id, id);
    setViews((current) => current.map((v) => (v.id === saved.id ? saved : v)));
  };

  const reorderPersonalTabs = async (ordered_ids: Array<number | string>) => {
    const saved = await boardContentService.updatePersonalViewOrder(
      board_id,
      ordered_ids.map((id) => Number(id))
    );
    setPersonalOrder(saved);
  };

  return {
    views,
    active_view_id,
    active_view,
    tabs,
    is_dirty,
    is_view_applied,
    current_filter_state,
    selectView,
    addView,
    renameView,
    changeViewEmoji,
    updateDocContent,
    deleteView,
    saveActiveView,
    saveAsNewView,
    duplicateView,
    pinView,
    lockView,
    reorderPersonalTabs,
  };
}

export default useBoardViewTabs;
