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
  | "email"
  | "rating"
  | "vote"
  | "link"
  | "files"
  | "time_tracking"
  | "auto_number"
  | "dependency"
  | "formula"
  | "connect_board"
  | "mirror"
  | "checklist";

/**
 * A `formula`-kind column's own config: an expression written with the
 * formula dialog, e.g. `{#12} * 1.2 + IF({#7} = "Done", 10, 0)`. Columns are
 * referenced by id (`{#12}`) so renaming one never breaks the formula; the
 * dialog shows and edits them by title (`{Budget}`).
 */
export interface FormulaConfig {
  expression: string;
}

/** A column a formula can read: the slice of a `ColumnDef` the expression engine needs to turn a raw cell value into a number, text, date or boolean. */
export interface FormulaSourceColumn {
  id: string;
  title: string;
  kind: ColumnKind;
  options?: StatusDef[];
}

/** A `mirror`-kind column's own config: which of this tab's `connect_board` columns to read through, and which column on that linked board to display. */
export interface MirrorConfig {
  source_column_id: string;
  mirrored_column_id: string;
}

/**
 * Any column kind's own validation rules, set from the header menu's
 * "Settings" panel (`ColumnSettingsPanel`) — advisory only: an unmet rule
 * flags the cell with a red outline/asterisk (see `isValueInvalid` in
 * `validationUtils.ts`), it never blocks a cell from being saved.
 * `min`/`max` only apply to a `number` column; `pattern` (a regular
 * expression, tested without anchors) only to the text-family kinds
 * (`text`/`longtext`/`phone`/`email`).
 */
export interface ColumnValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
}

/** One sub-task in a `checklist`-kind cell's value — see `ColumnKind`'s own doc comment. */
export interface ChecklistItemValue {
  id: string;
  text: string;
  is_done: boolean;
}

export interface ColumnDef {
  id: string;
  title: string;
  kind: ColumnKind;
  width: number;
  /** Column permissions: true when viewing or editing this column is limited to some people, shows a lock next to its title. */
  is_restricted?: boolean;
  align_left?: boolean;
  /**
   * Per-column option palette for the status/label/dropdown/tags kinds.
   * Real (API-backed) boards set this since each column owns its own option
   * set there; omitted for the mock demo data, which falls back to the
   * hook's shared board-wide `status_defs`/`label_defs`/`tag_defs`.
   */
  options?: StatusDef[];
  /**
   * People kind only: whether assigning someone on this column notifies them
   * (in-app toast + email) — the People cell picker's bottom toggle, backed
   * by the real column's `config.notify_on_assignment`. Defaults to `true`
   * (undefined) for the mock demo, which has no backing notification pipeline.
   */
  notify_on_assignment?: boolean;
  /** Formula kind only, see `FormulaConfig`. Undefined until the formula has been set up. */
  formula?: FormulaConfig;
  /** Formula kind only: every column (hidden ones included, from the same scope) the expression may reference, plus the row's own name as `__name`. Set even while `formula` is still undefined, so the dialog can offer them. */
  formula_sources?: FormulaSourceColumn[];
  /** Mirror kind only, see `MirrorConfig`. */
  mirror?: MirrorConfig;
  /** Connect-board kind only: the other board this column's cells link items on. */
  linked_board_id?: string;
  /** Any kind, see `ColumnValidation`'s own doc comment. */
  validation?: ColumnValidation;
  /** Number kind only: which aggregation the group summary row's footer shows for this column. Undefined behaves as `"sum"` (existing behavior). See `summaryUtils.ts`'s `summaryForColumn`. */
  aggregation?: "sum" | "avg" | "min" | "max" | "count";
  /** Date kind only: notifies everyone assigned in a People column on the same item once the date is `days_before` days away — sent daily by the backend's `board:send-due-date-reminders` scheduled command. */
  reminder?: { enabled: boolean; days_before: number };
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

/** A `link`-type column's value — the display text is separate from the URL, unlike a plain Text column. */
export interface LinkValue {
  url: string;
  text: string;
}

/** A `time_tracking`-type column's value — `running_since` is the ISO timestamp the timer was last started, or null while stopped; the displayed duration is `seconds` plus elapsed time since `running_since` when running. */
export interface TimeTrackingValue {
  seconds: number;
  running_since: string | null;
}

/** One file in a `files`-type column's cell — the cell's value is an array of these, mirroring `BoardItemAttachment` but scoped to one column instead of the whole item. */
export interface CellFile {
  id: string;
  file_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

/** Widened beyond the mock demo's own string/array/boolean values so a real board's `number`, `null`, timeline-range, link, time-tracking and files cell values pass through unchanged. */
export type CellValue =
  | string
  | string[]
  | number
  | boolean
  | { start: string; end: string }
  | LinkValue
  | TimeTrackingValue
  | CellFile[]
  | ChecklistItemValue[]
  | null
  | undefined;

export interface BoardTableNode {
  id: string;
  name: string;
  values: Record<string, CellValue>;
  /** Total comments posted on this row (item or subitem) — drives the message-icon badge in `ItemRow`/`SubitemRow`. Undefined for the standalone mock demo, which has no backing comments drawer. */
  comment_count?: number;
  /** Flags this individual row (item or subitem) as a priority row — the per-row counterpart of `BoardTableGroup.is_priority`, independent of any per-item Status/Priority column. Renders a star next to the row's name in `ItemRow`/`SubitemRow`. */
  is_priority?: boolean;
  /** Root items only: the Row menu's "Set recurring..." schedule, when one is set — renders a small repeat-icon badge next to the row's name in `ItemRow`. Undefined for the standalone mock demo and for subitems, which can't recur on their own. */
  recurrence?: { frequency: "daily" | "weekly" | "monthly"; interval_count: number } | null;
}

export interface BoardTableItem extends BoardTableNode {
  subs: BoardTableNode[];
}

export interface BoardTableGroup {
  key: string;
  title: string;
  color: string;
  tint: string;
  /** Flags this group as a priority client — separate from any per-item Status/Priority column, this marks the whole client as high-end so their tasks sort and render above everyone else's. */
  is_priority: boolean;
  items: BoardTableItem[];
  item_title: string;
  sub_title: string;
  base_columns: ColumnDef[];
  custom_columns: ColumnDef[];
  sub_base_columns: ColumnDef[];
  sub_custom_columns: ColumnDef[];
  /**
   * Whether this table's `items` have actually been fetched yet — undefined
   * (and `true`) for every caller that doesn't lazy-load (the standalone
   * mock demo, and Kanban/Calendar/Gantt's own eager-loaded tabs). `false`
   * means `items` is a placeholder (empty) and `GroupSection` should render
   * `GroupSkeletonRows` instead, triggering `actions.requestGroupItems` once
   * this table scrolls near the viewport.
   */
  is_items_loaded?: boolean;
  /**
   * This table's real root item count, known independently of whether its
   * rows have loaded yet (see `is_items_loaded`) — sizes the "N items"
   * label and the loading skeleton's row count before `items` is populated.
   */
  item_count?: number;
}

export interface PersonDef {
  id: string;
  initials: string;
  name: string;
  color: string;
  /** The account was disabled or deleted: shown faded on items already assigned to them, and left out of the picker. */
  is_deactivated?: boolean;
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

/** The single cell currently focused for Excel style keyboard navigation, see `useBoardTable`'s `moveActiveCell`. With `BoardTableState.selection_anchor` it also marks one corner of the selected range. */
export interface ActiveCell {
  node_id: string;
  column_id: string;
}

/**
 * An in progress "fill handle" drag (the little square at the bottom right
 * corner of the selection). Dragging it down or up writes the selected
 * cells' values into every row the pointer passes, continuing number and
 * date series like Excel or Google Sheets. The columns never change once the
 * drag starts, only the rows grow.
 */
export interface FillDragState {
  /** The selected columns being filled, left to right. */
  column_ids: string[];
  /** The selected rows the values are read from, top to bottom. */
  source_node_ids: string[];
  /** The row the pointer is over, the fill runs from the selection up to it. */
  hovered_node_id: string;
}

/**
 * What the table copied last (Ctrl/Cmd+C or Cut). The same text also goes on
 * the system clipboard as TSV. When a paste brings back exactly that text,
 * the structured values here are used instead of parsing the text again, so
 * values that have no text form (a checklist, a dependency) survive a copy
 * and paste inside the board.
 */
export interface TableClipboard {
  text: string;
  /** One entry per copied row, one cell per copied column. */
  rows: { column: ColumnDef; value: CellValue }[][];
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
