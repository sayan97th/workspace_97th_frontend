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
  BoardAdvancedFilterRow,
  BoardColumnKind,
  BoardConditionalColorRule,
  BoardRowHeight,
  BoardSortRule,
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
};

export type BoardColumnDto = {
  id: number;
  board_id: number;
  /** The tab (view) this column belongs to — columns are independent per tab. */
  board_view_id: number;
  key: string;
  label: string;
  type: BoardColumnType;
  position: number;
  width: number;
  config: BoardColumnConfig | null;
  hideable: boolean;
  pinnable: boolean;
};

export type BoardGroupDto = {
  id: number;
  board_id: number;
  /** The tab (view) this group belongs to — groups (and therefore their items) are independent per tab. */
  board_view_id: number;
  name: string;
  accent_color: string;
  position: number;
};

/** A cell value, shaped per the owning column's type — see {@link BoardColumnType}. */
export type BoardItemValue = string | number | boolean | string[] | null;

export type BoardItemDto = {
  id: number;
  board_id: number;
  group_id: number;
  name: string;
  /** Free-form item detail, edited from the item drawer — unlike column `values`, this is a first-class field on the item itself (like `name`), so it needs no backing column to exist. */
  description: string | null;
  position: number;
  values: Record<string, BoardItemValue>;
  /** Total comments (including replies) on this item — powers the row chat icon. Only `getItems` returns a real count; other calls return 0. */
  comment_count: number;
  /** Total attachments across this item's comments — powers the Kanban card's attachment count. Only `getItems` returns a real count; other calls return 0. */
  attachment_count: number;
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
};

/** The serializable subset of `useBoardToolbar` state a view saves/restores. */
export type BoardFilterState = {
  search_query: string;
  search_column_ids: string[];
  selected_person_ids: string[];
  quick_filter_selections: Record<string, string[]>;
  advanced_filter_rows: BoardAdvancedFilterRow[];
};

export type BoardViewDto = {
  id: number;
  board_id: number;
  label: string;
  /** Which content the tab renders — see `BoardViewKind` (@/components/board/boardViewTypes). Set once at creation and immutable afterward. */
  view_type: BoardViewKind;
  /** Markdown source for a `doc`-type view (see `BoardDocView`) — null/unused for every other kind. */
  doc_content: string | null;
  /** Key into `BOARD_VIEW_ICON_OPTIONS` (@/components/board/boardViewIcons); null renders the default per-position icon. */
  icon: string | null;
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
};

export type CreateBoardColumnPayload = {
  /** Which tab (view) the new column belongs to. */
  view_id: number;
  key: string;
  label: string;
  type: BoardColumnType;
  position?: number;
  width?: number;
  config?: BoardColumnConfig | null;
  hideable?: boolean;
  pinnable?: boolean;
};

export type UpdateBoardColumnPayload = Partial<Omit<CreateBoardColumnPayload, "key">>;

export type CreateBoardGroupPayload = {
  /** Which tab (view) the new group belongs to. */
  view_id: number;
  name: string;
  accent_color?: string;
  position?: number;
};

export type UpdateBoardGroupPayload = Partial<CreateBoardGroupPayload>;

export type CreateBoardItemPayload = {
  name: string;
  description?: string | null;
  group_id: number;
  position?: number;
  values?: Record<string, BoardItemValue>;
};

export type UpdateBoardItemPayload = {
  name?: string;
  description?: string | null;
  group_id?: number;
  position?: number;
};

/** Saves/creates a view — this is also the "save filters for this board view" payload. */
export type SaveBoardViewPayload = {
  label?: string;
  /** Only meaningful on creation — the backend ignores it on update (a view's type is immutable). Defaults to `"table"` when omitted. */
  view_type?: BoardViewKind;
  icon?: string | null;
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
};
