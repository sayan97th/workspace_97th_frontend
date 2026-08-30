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

export interface BoardSubitem {
  id: string;
  name: string;
  owner_ids: string[];
  status: BoardStatus;
  date: string;
}

export interface BoardItem {
  id: string;
  name: string;
  owner_ids: string[];
  status: BoardStatus;
  date: string;
  priority: BoardPriority;
  subitems: BoardSubitem[];
}

export interface BoardSimpleItem {
  id: string;
  name: string;
  owner_id: string;
  status: BoardStatus;
  date: string;
  priority: BoardPriority;
  progress: number;
}

export type DragParentId = "ROOT" | string;

export type ActiveBoardTab = "main-table" | "timeline";
