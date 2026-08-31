import type { BoardCellOption, BoardCellValue } from "@/components/board/cells/BoardValueCell";
import type { BoardColumnKind } from "@/components/board/columnTypes";

export interface Person {
  id: string;
  initials: string;
  name: string;
  avatar_bg: string;
}

export type BoardStatus = string;

/** A status/priority option's id, label and color — resolves a row's raw `status`/`priority` id into what {@link StatusCell}/{@link PriorityBadge} render. Real boards supply these from a column's `config.options`; the standalone preview supplies them from `constants.ts`. */
export interface TableBoardOption {
  id: string;
  label: string;
  color: string;
}

/** Freeform to match any real board's own priority-column option ids, rather than a fixed set. */
export type BoardPriority = string;

/**
 * A user-added column beyond the board's fixed Owner/Status/Date/Priority set
 * — created via the trailing "+" header button's {@link AddColumnMenu}. Each
 * row's value for it lives in that row's own `values` map, keyed by this
 * column's `id`, mirroring how the real, backend-driven board keys
 * `BoardItemDto.values` by column id.
 */
export interface TableBoardColumn {
  id: string;
  kind: BoardColumnKind;
  label: string;
  width: number;
  /** Status/Dropdown columns only — the colour-coded labels the cell can pick from. */
  options?: BoardCellOption[];
}

export interface BoardSubitem {
  id: string;
  name: string;
  owner_ids: string[];
  status: BoardStatus;
  date: string;
  /** Total comments (including replies) on this subitem — powers the row chat icon's count badge. */
  comment_count: number;
  /** This row's values for any dynamically-added {@link TableBoardColumn}s, keyed by column id. */
  values?: Record<string, BoardCellValue>;
}

export interface BoardItem {
  id: string;
  name: string;
  owner_ids: string[];
  status: BoardStatus;
  date: string;
  priority: BoardPriority;
  subitems: BoardSubitem[];
  /** Total comments (including replies) on this item — powers the row chat icon's count badge. */
  comment_count: number;
  /** This row's values for any dynamically-added {@link TableBoardColumn}s, keyed by column id. */
  values?: Record<string, BoardCellValue>;
}

export interface BoardSimpleItem {
  id: string;
  name: string;
  owner_id: string;
  status: BoardStatus;
  date: string;
  priority: BoardPriority;
  progress: number;
  /** Total comments (including replies) on this item — powers the row chat icon's count badge. */
  comment_count: number;
  /** This row's values for any dynamically-added {@link TableBoardColumn}s, keyed by column id. */
  values?: Record<string, BoardCellValue>;
}

export type DragParentId = "ROOT" | string;

export type ActiveBoardTab = "main-table" | "timeline";
