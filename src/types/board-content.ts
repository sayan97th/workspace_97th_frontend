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
  position: number;
  values: Record<string, BoardItemValue>;
  /** Total comments (including replies) on this item — powers the row chat icon. Only `getItems` returns a real count; other calls return 0. */
  comment_count: number;
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
  /** Key into `BOARD_VIEW_ICON_OPTIONS` (@/components/board/boardViewIcons); null renders the default per-position icon. */
  icon: string | null;
  position: number;
  is_primary: boolean;
  filter_state: BoardFilterState | null;
  sort_state: BoardSortRule[] | null;
  group_by_option_id: string | null;
  hidden_column_ids: string[] | null;
  pinned_column_ids: string[] | null;
  row_height: BoardRowHeight;
  conditional_color_rules: BoardConditionalColorRule[] | null;
};

export type CreateBoardColumnPayload = {
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
  name: string;
  accent_color?: string;
  position?: number;
};

export type UpdateBoardGroupPayload = Partial<CreateBoardGroupPayload>;

export type CreateBoardItemPayload = {
  name: string;
  group_id: number;
  position?: number;
  values?: Record<string, BoardItemValue>;
};

export type UpdateBoardItemPayload = {
  name?: string;
  group_id?: number;
  position?: number;
};

/** Saves/creates a view — this is also the "save filters for this board view" payload. */
export type SaveBoardViewPayload = {
  label?: string;
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
};
