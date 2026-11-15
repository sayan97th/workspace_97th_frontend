import type { BoardOptionsPerson } from "./board-options";

/** Where an entry of the board Activity log comes from: a cell change of an item, or a structural board event. */
export type BoardActivitySource = "cell" | "board";

/** One side of a change: its text, a label or group color, and the people of a People column. */
export type BoardActivityValue = {
  text: string | null;
  color?: string | null;
  people?: BoardOptionsPerson[];
};

export type BoardActivityGroupRef = {
  id: number | null;
  name: string | null;
  color: string | null;
};

export type BoardActivityItemRef = {
  id: number;
  name: string;
  parent_id: number | null;
  is_archived: boolean;
  is_deleted: boolean;
  group: BoardActivityGroupRef | null;
};

/**
 * One row of the board Activity log (`GET /api/boards/{id}/activity-log/feed`),
 * see `App\Services\Board\BoardActivityFeed` on the backend.
 * `action` is `value_changed`, `item_renamed` or `item_group_changed` for a
 * cell change, otherwise the board event (`item_created`, `group_renamed`, ...).
 */
export type BoardActivityEntry = {
  key: string;
  source: BoardActivitySource;
  id: number;
  action: string;
  created_at: string;
  user: BoardOptionsPerson | null;
  automation: { id: number | null; name: string } | null;
  item: BoardActivityItemRef | null;
  group: BoardActivityGroupRef | null;
  column: { id: number | null; label: string; type: string | null } | null;
  board_name?: string;
  old_value: BoardActivityValue | null;
  new_value: BoardActivityValue | null;
  description: string | null;
  can_undo: boolean;
  undone_at: string | null;
};

export type BoardActivityFacets = {
  columns: Array<{ id: number; label: string; type: string; scope: string }>;
  groups: Array<{ id: number; name: string; color: string | null; is_archived: boolean }>;
  people: BoardOptionsPerson[];
};

export type BoardActivityFeedPage = {
  data: BoardActivityEntry[];
  meta: { next_cursor: string | null; facets: BoardActivityFacets | null };
};

/** "Filter log" event types, see `BoardActivityFeed::BOARD_EVENT_TYPES` and `CELL_EVENT_TYPES`. */
export type BoardActivityEventType =
  | "column_values"
  | "item_name"
  | "item_moved"
  | "item_created"
  | "item_archived"
  | "item_deleted"
  | "item_restored"
  | "groups"
  | "columns"
  | "board"
  | "automations";

/** The date range of "Filter log". */
export type BoardActivityPeriod = "all" | "today" | "yesterday" | "last_7_days" | "last_30_days";

export type BoardActivityFilters = {
  search: string;
  user_ids: number[];
  column_ids: number[];
  group_ids: number[];
  event_types: BoardActivityEventType[];
  period: BoardActivityPeriod;
  automation_only: boolean;
};

export type BoardActivityUndoResult = {
  message: string;
  item_ids: number[];
  needs_structure_refresh: boolean;
};

/** One row of the "Last viewed" tab. */
export type BoardActivityViewer = {
  user: BoardOptionsPerson;
  visited_at: string;
};

/** One row of the "Updates" tab. */
export type BoardActivityUpdate = {
  id: number;
  body: string;
  created_at: string;
  edited_at: string | null;
  replies_count: number;
  likes_count: number;
  is_from_automations: boolean;
  automation_name: string | null;
  author: BoardOptionsPerson | null;
  item: { id: number; name: string; parent_id: number | null; group: BoardActivityGroupRef | null };
};

export type BoardActivityUpdatesPage = {
  data: BoardActivityUpdate[];
  meta: { current_page: number; last_page: number; total: number };
};
