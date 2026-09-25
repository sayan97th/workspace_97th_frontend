/**
 * API types for the reusable "table board" engine — the generic backend for
 * any board's tables (groups), rows (items/"pulses"), typed columns, and
 * saved views/tabs. Mirrors the Laravel `Board*Resource` payloads under
 * `App\Http\Controllers\Board\*`.
 *
 * `filter_state`/`sort_state`/etc on a {@link BoardViewDto} reuse the same
 * shapes `useBoardToolbar` already works with (`BoardAdvancedFilterRow`,
 * `BoardSortRule`, `BoardConditionalColorRule` from `@/components/board`),
 * so a saved view's state can be dropped straight into the toolbar without
 * translation.
 */
import type {
  BoardChartConfig,
  BoardColumnKind,
  BoardConditionalColorRule,
  BoardRowHeight,
  BoardSortRule,
  BoardToolbarFilterState,
  BoardViewKind,
} from "@/components/board";

/**
 * The engine's column data-type. Aliases {@link BoardColumnKind} from the board
 * kit so the presentational components and this API layer share one definition
 * (the kit must not depend on this file — that would be a circular import).
 */
export type BoardColumnType = BoardColumnKind;

/** One option in a `status`/`tags` column's `config.options`. */
export type BoardColumnOption = {
  id: string;
  label: string;
  color: string;
  /** Deactivated labels stay assigned to any item that already has them but drop out of the picker's selectable list. Defaults to true when omitted. */
  is_active?: boolean;
  /** Optional helper text shown under the label in the Edit Labels panel. */
  description?: string | null;
};

export type BoardColumnConfig = {
  options?: BoardColumnOption[];
  /** People columns only: whether assigning someone here notifies them (in-app + email). Defaults to `true` server-side when unset. Edited from the People cell picker's bottom toggle. */
  notify_on_assignment?: boolean;
  /** Formula columns only: the expression the formula dialog saves, with columns referenced by id (`{#12}`), see `FormulaConfig` in `@/components/board/table/types`. */
  expression?: string;
  /** Formula columns only, legacy: the fixed operation applied to `source_column_ids` before expressions existed. Converted to an `expression` when read, and dropped the next time the formula is saved. */
  operation?: "sum" | "subtract" | "multiply" | "divide" | "concat";
  source_column_ids?: number[];
  /** Connect-board columns only: the other board this column's cells link items on. */
  linked_board_id?: number;
  /** Mirror columns only: which of this tab's own connect-board columns to read through (`source_column_id`), and which column on that linked board to display (`mirrored_column_id`). */
  source_column_id?: number;
  mirrored_column_id?: number;
  /** Any column type: advisory validation rules — see `ColumnValidation` in `@/components/board/table/types` (same shape, this is the wire-format twin). */
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  /** Number columns only: which aggregation the Table view's group summary footer shows for this column. Defaults to `"sum"` when unset — see `ColumnDef.aggregation` in `@/components/board/table/types`. */
  aggregation?: "sum" | "avg" | "min" | "max" | "count";
  /** Date columns only: due-date reminder settings, sent daily by the backend's `board:send-due-date-reminders` command — see `ColumnDef.reminder` in `@/components/board/table/types`. */
  reminder?: { enabled: boolean; days_before: number };
};

/** Which row a column applies to: a board's own (root) items, or their subitems — two independent column sets, mirroring monday.com's implicit subitem sub-board. */
export type BoardColumnScope = "item" | "subitem";

export type BoardColumnDto = {
  id: number;
  board_id: number;
  /** The tab (view) this column belongs to — columns are independent per tab. */
  board_view_id: number;
  key: string;
  label: string;
  type: BoardColumnType;
  scope: BoardColumnScope;
  position: number;
  width: number;
  config: BoardColumnConfig | null;
  hideable: boolean;
  pinnable: boolean;
  /** Column permissions: who may see this column's values. `null` means everyone. */
  view_restriction: BoardColumnRestriction | null;
  /** Column permissions: who may change this column's values. `null` means everyone. */
  edit_restriction: BoardColumnRestriction | null;
  /** Whether the current user may change this column's cells (board owners always may). */
  can_edit_values: boolean;
};

/** The people and teams a restricted column lets through, on top of the board owners. */
export type BoardColumnRestriction = {
  user_ids: number[];
  team_ids: number[];
};

export type UpdateBoardColumnPermissionsPayload = {
  view_restriction?: BoardColumnRestriction | null;
  edit_restriction?: BoardColumnRestriction | null;
};

export type BoardGroupDto = {
  id: number;
  board_id: number;
  /** The tab (view) this group belongs to — groups (and therefore their items) are independent per tab. */
  board_view_id: number;
  name: string;
  accent_color: string;
  /** Flags this group as a priority client — separate from any per-item Status/Priority column, this marks the whole client as high-end so their tasks sort above everyone else's. */
  is_priority: boolean;
  position: number;
  /**
   * Root item count (excludes subitems/archived), independent of whether
   * this table's actual rows have been fetched yet — see `GroupSection`'s
   * lazy per-table loading, which uses this to size a table's "N items"
   * label and its loading skeleton before `getItems` resolves.
   */
  item_count: number;
};

/** A `timeline`-type column's value — both `YYYY-MM-DD`. */
export type BoardTimelineValue = { start: string; end: string };

/** A `link`-type column's value — the display text is separate from the URL. */
export type BoardLinkValue = { url: string; text: string };

/** A `time_tracking`-type column's value — see the Table kit's own `TimeTrackingValue` for the field meanings. */
export type BoardTimeTrackingValue = { seconds: number; running_since: string | null };

/** One file in a `files`-type column's cell — mirrors the Table kit's own `CellFile`. */
export type BoardCellFile = { id: string; file_name: string; url: string; mime_type: string; size_bytes: number };

/** A cell value, shaped per the owning column's type — see {@link BoardColumnType}. */
export type BoardItemValue =
  | string
  | number
  | boolean
  | string[]
  | BoardTimelineValue
  | BoardLinkValue
  | BoardTimeTrackingValue
  | BoardCellFile[]
  | null;

export type BoardItemDto = {
  id: number;
  board_id: number;
  group_id: number;
  /** The item this is a subitem of, or null for a top-level (root) item. */
  parent_id: number | null;
  name: string;
  /** Free-form item detail, edited from the item drawer — unlike column `values`, this is a first-class field on the item itself (like `name`), so it needs no backing column to exist. */
  description: string | null;
  position: number;
  /** Flags this individual item (or subitem) as a priority row — the per-row counterpart of `BoardGroupDto.is_priority`, independent of any per-item Status/Priority column. */
  is_priority: boolean;
  values: Record<string, BoardItemValue>;
  /** Total comments (including replies) on this item — powers the row chat icon. Only `getItems` returns a real count; other calls return 0. */
  comment_count: number;
  /** Total attachments across this item's comments — powers the Kanban card's attachment count. Only `getItems` returns a real count; other calls return 0. */
  attachment_count: number;
  /** Total subtask checklist lines — powers the Kanban card's "✓ done/total" badge. Only `getItems` returns a real count; other calls return 0. */
  checklist_total_count: number;
  /** Subtask checklist lines marked done — see {@link checklist_total_count}. */
  checklist_done_count: number;
  /** Direct subitem count — powers the collapsed row's "N Subitems" badge. Only `getItems` returns a real count; other calls return 0. */
  subitem_count: number;
  /**
   * This item's direct subitems — only ever one level deep, since a subitem
   * can't itself have subitems (mirroring monday.com's two-level item/subitem
   * model; the backend rejects a `parent_id` that isn't already a root item).
   * Only `getItems` populates this; every other call (create/rename/update
   * value) returns an empty array. Children never flow through the table's
   * filter/sort/search/group-by pipeline — they only ever render nested
   * beneath their (visible, expanded) parent row.
   */
  children: BoardItemDto[];
  /** The Row menu's "Set recurring..." schedule, when this item has one — only `getItems` populates this; every other call resolves it to null. */
  recurrence: { frequency: "daily" | "weekly" | "monthly"; interval_count: number } | null;
  /** Who created the item, the "Created by" filter and sort field. Null for items created before authors were recorded. */
  created_by_id?: number | null;
  /** ISO timestamp the item was created, the "Creation date" filter and sort field. */
  created_at?: string | null;
  /** ISO timestamp of the latest change to the item or any of its values, the "Last updated" filter and sort field. */
  last_updated_at?: string | null;
};

/** One line of a board item's subtask checklist — see `BoardItemDto.checklist_total_count`. */
export type BoardItemChecklistItemDto = {
  id: number;
  item_id: number;
  label: string;
  is_done: boolean;
  position: number;
};

/** Extends {@link BoardItemDto} with the fields the pulse detail drawer shows. */
export type BoardItemDetailDto = BoardItemDto & {
  created_at: string | null;
  group: {
    id: number;
    name: string;
    accent_color: string;
  };
  creator: {
    id: number;
    full_name: string;
    profile_photo_url: string | null;
  } | null;
  checklist_items: BoardItemChecklistItemDto[];
};

/**
 * The serializable subset of `useBoardToolbar` state a view saves/restores.
 * The And/Or groups, top-level operator and Quick filters column choice are
 * optional, since views saved before they existed do not carry them.
 */
export type BoardFilterState = BoardToolbarFilterState;

export type BoardViewDto = {
  id: number;
  board_id: number;
  label: string;
  /** Which content the tab renders — see `BoardViewKind` (@/components/board/boardViewTypes). Set once at creation and immutable afterward. */
  view_type: BoardViewKind;
  /** Markdown source for a `doc`-type view (see `BoardDocView`) — null/unused for every other kind. */
  doc_content: string | null;
  /** Chart type/data source/grouping for a `chart`-type view (see `BoardChartView`) — null/unused for every other kind. */
  chart_config: BoardChartConfig | null;
  /** A single emoji carried by the tab; null renders the default per-position icon. */
  emoji: string | null;
  position: number;
  is_primary: boolean;
  /** Sorts ahead of unpinned tabs (behind the primary tab) whenever the viewer has no personal tab order saved. */
  pinned: boolean;
  /** While locked, nobody can rename/delete/duplicate the view or save filter/sort/display changes to it. */
  is_locked: boolean;
  locked_by_id: number | null;
  filter_state: BoardFilterState | null;
  sort_state: BoardSortRule[] | null;
  group_by_option_id: string | null;
  hidden_column_ids: string[] | null;
  pinned_column_ids: string[] | null;
  row_height: BoardRowHeight;
  conditional_color_rules: BoardConditionalColorRule[] | null;
  created_at: string | null;
  updated_at: string | null;
  creator: {
    id: number;
    full_name: string;
    profile_photo_url: string | null;
  } | null;
};

/**
 * `GET /api/boards/{board_id}/views` — the board's tabs plus the
 * authenticated viewer's own "Reorder (for you only)" tab order, if they've
 * ever saved one for this board.
 */
export type BoardViewsIndexDto = {
  views: BoardViewDto[];
  personal_order: number[] | null;
  /** The viewer's remembered, unsaved toolbar changes per view id. Only views they changed have an entry. */
  personal_states: Record<string, BoardViewPersonalStateDto>;
};

/**
 * One viewer's remembered toolbar changes to one view ("Remember my filters"):
 * what they filtered, sorted, hid or grouped by without saving it to the view.
 * Private to them, and replayed instead of the view's saved state until they
 * reset it or it matches the view again.
 */
export type BoardViewPersonalStateDto = {
  filter_state: BoardFilterState | null;
  sort_state: Omit<BoardSortRule, "id">[] | null;
  hidden_column_ids: string[] | null;
  group_by_option_id: string | null;
};

/** A personal, named filter one viewer saved on a board (the Filter panel's "Saved filters"). */
export type BoardSavedFilterDto = {
  id: number;
  name: string;
  filter_state: BoardFilterState;
  created_at: string;
};

export type CreateBoardColumnPayload = {
  /** Which tab (view) the new column belongs to. */
  view_id: number;
  key: string;
  label: string;
  type: BoardColumnType;
  /** Defaults to "item" server-side when omitted. Immutable after creation — not part of {@link UpdateBoardColumnPayload}. */
  scope?: BoardColumnScope;
  position?: number;
  width?: number;
  config?: BoardColumnConfig | null;
  hideable?: boolean;
  pinnable?: boolean;
};

export type UpdateBoardColumnPayload = Partial<Omit<CreateBoardColumnPayload, "key" | "scope">>;

/**
 * PATCH /api/boards/{board_id}/columns/reorder — a column-header
 * drag-and-drop reorder within one scope (main table header or subitem
 * header). `view_id` defaults to the board's primary tab server-side when
 * omitted, mirroring every other per-tab column endpoint.
 */
export type ReorderBoardColumnsPayload = {
  scope: BoardColumnScope;
  view_id?: number;
  ordered_ids: number[];
};

export type CreateBoardGroupPayload = {
  /** Which tab (view) the new group belongs to. */
  view_id: number;
  name: string;
  accent_color?: string;
  is_priority?: boolean;
  position?: number;
};

export type UpdateBoardGroupPayload = Partial<CreateBoardGroupPayload>;

/**
 * `GET /api/boards/{board_id}/groups` — a tab's tables plus the authenticated
 * viewer's own collapsed/expanded state for them, if they've ever saved one
 * for this tab. Only the *collapsed* ids are ever sent, so this stays a small
 * payload even for a tab with hundreds of tables.
 */
export type BoardGroupsIndexDto = {
  groups: BoardGroupDto[];
  collapsed_group_ids: number[];
};

/** `PUT /api/boards/{board_id}/groups/collapsed-state` — saves the viewer's own collapsed/expanded set for one tab's tables. */
export type UpdateGroupCollapseStatePayload = {
  /** Which tab (view) this collapse state applies to. Defaults to the board's primary tab server-side when omitted. */
  view_id?: number;
  collapsed_group_ids: number[];
};

/**
 * One option in the Tags column's board-wide list — shared across every
 * `tags`-type column on the same board (unlike Status/Dropdown, whose options
 * live per-column in `BoardColumnDto.config.options`), mirroring monday.com's
 * own Tags column.
 */
export type BoardTagDto = {
  id: number;
  board_id: number;
  label: string;
  color: string;
  position: number;
};

export type CreateBoardTagPayload = {
  label: string;
  color: string;
};

export type UpdateBoardTagPayload = Partial<CreateBoardTagPayload> & { position?: number };

export type CreateBoardItemPayload = {
  name: string;
  description?: string | null;
  /** Required unless `parent_id` is given — a subitem inherits its group from its parent. */
  group_id?: number;
  /** Creates a subitem of this item instead of a top-level row. */
  parent_id?: number;
  /** Creates the row as the next sibling of this item (same table, same parent), shifting later siblings down. Row menu's "Create new item below". */
  after_item_id?: number;
  position?: number;
  is_priority?: boolean;
  values?: Record<string, BoardItemValue>;
};

/** Row menu's "Convert to subitem" / "Convert to item" / "Move to item". `group_id` is only read when `parent_id` is null, it names the table the promoted row lands in. */
export type UpdateBoardItemParentPayload = {
  parent_id: number | null;
  group_id?: number;
};

export type UpdateBoardItemPayload = {
  name?: string;
  description?: string | null;
  group_id?: number;
  position?: number;
  is_priority?: boolean;
};

/**
 * PATCH /api/boards/{board_id}/items/reorder — a drag-and-drop reorder.
 * `"root"` resequences a table's root items, optionally moving the dragged
 * one (`moved_item_id`) into a *different* table (`target_group_id`) at an
 * arbitrary position; `source_group_id`/`source_ordered_ids` resequence the
 * vacated table's remaining items on a cross-table move. `"subitem"`
 * resequences one item's subitems — subitems never change parent through
 * this endpoint.
 */
export type ReorderBoardItemsPayload =
  | {
      scope: "root";
      moved_item_id: number;
      target_group_id: number;
      target_ordered_ids: number[];
      source_group_id?: number;
      source_ordered_ids?: number[];
    }
  | {
      scope: "subitem";
      target_parent_id: number;
      target_ordered_ids: number[];
    };

export type CreateChecklistItemPayload = {
  label: string;
};

export type UpdateChecklistItemPayload = {
  label?: string;
  is_done?: boolean;
};

/** Saves/creates a view — this is also the "save filters for this board view" payload. */
/** The filter slice `GET /api/boards/{board_id}/items` narrows rows by (see `boardContentService.getItems`). */
export type BoardItemsServerFilter = {
  filter_state: Pick<
    BoardFilterState,
    | "selected_person_ids"
    | "selected_team_ids"
    | "person_column_ids"
    | "quick_filter_selections"
    | "quick_filter_exclusions"
    | "advanced_filter_rows"
    | "advanced_filter_groups"
    | "advanced_filter_operator"
    | "include_subitems"
  >;
  /** The viewer's own date, `YYYY-MM-DD`. */
  today: string;
  /** The viewer's IANA time zone, which turns Creation date and Last updated timestamps into the days they see. */
  timezone: string;
};

/**
 * POST /api/boards/{board_id}/views/{view_id}/duplicate. With no payload it is
 * the tab menu's plain "Duplicate". The toolbar's "Save as new view" also sends
 * the label and the live filter/sort/display state, which the API saves on the
 * copy after remapping column and group ids onto the copied ones.
 */
export type DuplicateBoardViewPayload = {
  label?: string;
  filter_state?: BoardFilterState | null;
  sort_state?: BoardSortRule[] | null;
  group_by_option_id?: string | null;
  hidden_column_ids?: string[] | null;
  pinned_column_ids?: string[] | null;
  row_height?: BoardRowHeight;
  conditional_color_rules?: BoardConditionalColorRule[] | null;
};

export type SaveBoardViewPayload = {
  label?: string;
  /** Only meaningful on creation — the backend ignores it on update (a view's type is immutable). Defaults to `"table"` when omitted. */
  view_type?: BoardViewKind;
  emoji?: string | null;
  position?: number;
  is_primary?: boolean;
  filter_state?: BoardFilterState | null;
  sort_state?: BoardSortRule[] | null;
  group_by_option_id?: string | null;
  hidden_column_ids?: string[] | null;
  pinned_column_ids?: string[] | null;
  row_height?: BoardRowHeight;
  conditional_color_rules?: BoardConditionalColorRule[] | null;
  /** Markdown source, saved by a `doc`-type view's autosave. */
  doc_content?: string | null;
  /** Chart type/data source/grouping, saved whenever a `chart`-type view's config panel changes. */
  chart_config?: BoardChartConfig | null;
};

/** One table (group) of a board an item can be moved into, see {@link BoardItemMoveTargetDto}. */
export type BoardItemMoveTargetGroupDto = {
  id: number;
  name: string;
  accent_color: string;
};

/** A board the item drawer's "Move to board" action can move an item into, with its tables. */
export type BoardItemMoveTargetDto = {
  id: number;
  label: string;
  groups: BoardItemMoveTargetGroupDto[];
};

/** Where the item drawer's "Move to board" action lands an item. */
export type MoveBoardItemToBoardPayload = {
  target_board_id: number;
  target_group_id: number;
};
