// Standalone type definitions for the /test/task-board sandbox view.
// Intentionally self-contained: nothing here is shared with the production
// board feature under src/components/board.

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

export type CellValue = string | string[] | boolean | undefined;

export interface TaskBoardNode {
  id: string;
  name: string;
  values: Record<string, CellValue>;
}

export interface TaskBoardItem extends TaskBoardNode {
  subs: TaskBoardNode[];
}

export interface TaskBoardGroup {
  key: string;
  title: string;
  color: string;
  tint: string;
  items: TaskBoardItem[];
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
}

/** Which popover/picker/menu is open, addressed by a scoped string key. */
export interface OpenMenus {
  row_menu_id: string | null;
  group_menu_key: string | null;
  column_menu_key: string | null;
  cell_menu_key: string | null;
  picker_key: string | null;
  owner_menu_key: string | null;
}
