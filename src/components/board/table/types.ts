// Type definitions for the Table Board view (BoardTable and its
// cells/group/menus/rows subcomponents). Local to this folder rather than
// the generic board/types.ts, mirroring how the chart and gantt views keep
// their own types.ts.

export type ColumnKind =
  | "text"
  | "longtext"
  | "number"
  | "status"
  | "label"
  | "date"
  | "timeline"
  | "people"
  | "progress"
  | "dropdown"
  | "tags"
  | "checkbox"
  | "phone"
  | "email";

export interface ColumnDef {
  id: string;
  title: string;
  kind: ColumnKind;
  width: number;
  align_left?: boolean;
  /**
   * Per-column option palette for the status/label/dropdown/tags kinds.
   * Real (API-backed) boards set this since each column owns its own option
   * set there; omitted for the mock demo data, which falls back to the
   * hook's shared board-wide `status_defs`/`label_defs`/`tag_defs`.
   */
  options?: StatusDef[];
}

export interface StatusDef {
  id: string;
  label: string;
  color: string;
  fixed?: boolean;
}

export interface TagDef {
  id: string;
  label: string;
  color: string;
}

/** Widened beyond the mock demo's own string/array/boolean values so a real board's `number`, `null` and timeline-range cell values pass through unchanged. */
export type CellValue = string | string[] | number | boolean | { start: string; end: string } | null | undefined;

export interface BoardTableNode {
  id: string;
  name: string;
  values: Record<string, CellValue>;
}

export interface BoardTableItem extends BoardTableNode {
  subs: BoardTableNode[];
}

export interface BoardTableGroup {
  key: string;
  title: string;
  color: string;
  tint: string;
  items: BoardTableItem[];
  item_title: string;
  sub_title: string;
  base_columns: ColumnDef[];
  custom_columns: ColumnDef[];
  sub_base_columns: ColumnDef[];
  sub_custom_columns: ColumnDef[];
}

export interface PersonDef {
  id: string;
  initials: string;
  name: string;
  color: string;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  scope_key: string;
  column_id: string;
  direction: "asc" | "desc";
}

export interface DragState {
  node_id: string;
  parent_id: string;
  /**
   * The id order of the dragged node's list (its group's `items`, or its
   * parent's `subs`) captured at drag start — compared against that same
   * list's order at drag end so `onDragEnd` only reports a reorder (and thus
   * only persists one) when the drop actually changed something.
   */
  origin_order: string[];
}

/** Which list of rows got reordered — a table's own root items, or one item's subitems. */
export type ReorderScope = "root" | "subitem";

/**
 * Reported by `onDragEnd` once a drag has actually changed a list's order,
 * for a real board to persist server-side (see `UseBoardTableConfig.onReorderItems`).
 * `ordered_ids` is that list's full id order after the drop, in display order
 * top-to-bottom — root items never change group through drag-and-drop (each
 * row only ever reorders within its own group's list), so `group_key`/
 * `parent_id` name the *same* list `moved_id` already belonged to.
 */
export type ReorderPayload =
  | { scope: "root"; moved_id: string; group_key: string; ordered_ids: string[] }
  | { scope: "subitem"; moved_id: string; parent_id: string; ordered_ids: string[] };

/** Which popover/picker/menu is open, addressed by a scoped string key. */
export interface OpenMenus {
  row_menu_id: string | null;
  group_menu_key: string | null;
  column_menu_key: string | null;
  cell_menu_key: string | null;
  picker_key: string | null;
  owner_menu_key: string | null;
}
