// Type definitions for the Table Board view (BoardTable and its
// cells/group/menus/rows subcomponents). Local to this folder rather than
// the generic board/types.ts, mirroring how the chart and gantt views keep
// their own types.ts.

import type { BoardColumnKind } from "../columnTypes";

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
  | "checklist"
  | "button"
  | "doc"
  | "world_clock"
  | "location"
  | "creation_log"
  | "last_updated"
  | "item_number"
  | "week"
  | "country"
  | "color_picker"
  | "hour"
  | "progress_tracking";

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
/**
 * A column's settings change from its header (menu, resize, settings panels), persisted through
 * `UseBoardTableConfig.onUpdateColumnSettings`. Each key belongs to the column kinds noted.
 */
export interface ColumnSettingsPatch {
  width?: number;
  hideable?: boolean;
  pinnable?: boolean;
  /** Formula columns only, see `ColumnDef.formula`. */
  formula?: FormulaConfig;
  /** Mirror columns only, see `ColumnDef.mirror`. */
  mirror?: MirrorConfig;
  /** Connect-board columns only, see `ColumnDef.linked_board_id`. */
  linked_board_id?: string;
  /** Any column kind, see `ColumnDef.validation`. */
  validation?: ColumnValidation;
  /** Number columns only, see `ColumnDef.aggregation`. */
  aggregation?: ColumnDef["aggregation"];
  /** Date columns only, see `ColumnDef.reminder`. */
  reminder?: ColumnDef["reminder"];
  /** Button columns only, see `ColumnDef.button`. */
  button?: ColumnDef["button"];
  /** Dependency columns only, see `ColumnDef.dependency`. */
  dependency?: DependencyConfig;
  /** Any column kind, see `ColumnDef.description`. Null removes it. */
  description?: string | null;
  /** Any column kind, see `ColumnDef.hide_summary`. */
  hide_summary?: boolean;
  /** Hour columns only, see `ColumnDef.hour_format`. */
  hour_format?: HourFormat;
  /** Rating columns only, see `ColumnDef.rating_max`. */
  rating_max?: number;
  /** Rating columns only, see `ColumnDef.rating_icon`. */
  rating_icon?: RatingIcon;
  /** Progress tracking columns only, see `ColumnDef.progress_columns`. Null tracks every Status column again. */
  progress_columns?: ProgressColumnWeight[] | null;
}

/** An Hour column's display, "2:30 PM" or "14:30". */
export type HourFormat = "12" | "24";

export interface MirrorConfig {
  source_column_id: string;
  mirrored_column_id: string;
}

/**
 * A Connect boards column's "Boards settings", monday.com style: the boards it connects, whether
 * a cell may link more than one item, and whether the links also show in a column on the
 * connected board (two-way, only possible with a single board).
 */
export interface ConnectSettings {
  linked_board_ids: string[];
  allow_multiple_items: boolean;
  two_way: boolean;
}

/**
 * What a Connect boards or Mirror column is linked to, for the header's "Linkage" popover: the
 * boards it shows items from (each with where it opens) and, for a Mirror, the column it mirrors.
 */
export interface ColumnLinkage {
  boards: { id: string; name: string; href: string }[];
  /** Connected boards the viewer may not open, never named. */
  hidden_board_count: number;
  mirrored_column: { label: string; board_name: string; board_href: string } | null;
}

/** A connected board's column shown by a Mirror column, with its labels for status-like kinds. */
export interface MirroredColumnOption {
  id: string;
  label: string;
  type: BoardColumnKind;
  options: StatusDef[];
}

/** One group of a connected board, listed with its color in the cell picker. */
export interface ConnectGroupOption {
  id: string;
  name: string;
  color: string;
}

/** One column of a connected board, offered in the picker's "Choose columns to search". */
export interface ConnectColumnOption {
  id: string;
  label: string;
  /** The board engine's column type, which picks its icon from `COLUMN_KIND_SWATCH`. */
  type: BoardColumnKind;
}

/** One item of a connected board. `group_id` is null when it lives in another tab of that board, so it is only shown in cells. */
export interface ConnectItemOption {
  id: string;
  board_id: string;
  name: string;
  group_id: string | null;
  color: string | null;
  /** Where the item opens, `/boards/{board_id}/pulses/{id}?view_id=...`. */
  href: string | null;
  /** The tab of its board that holds the item, which decides the columns its card shows. */
  view_id: string | null;
  created_at: string | null;
  /** Searchable text of each cell, keyed by column id. */
  texts: Record<string, string>;
  /** Raw values of the columns this board's Mirror columns show, keyed by column id. */
  values: Record<string, CellValue>;
}

export interface ConnectBoardOption {
  id: string;
  name: string;
  can_add_items: boolean;
  groups: ConnectGroupOption[];
  columns: ConnectColumnOption[];
  items: ConnectItemOption[];
  /** The columns of this board that Mirror columns show through the Connect boards column. */
  mirrored_columns: MirroredColumnOption[];
}

/** One connected board in "Connected board column settings". `name` is null and `path` empty for a board the viewer may not open. */
export interface ConnectedBoardSummary {
  id: string;
  name: string | null;
  is_private: boolean;
  is_accessible: boolean;
  /** Workspace, then each folder down to the board. */
  path: string[];
}

/** Which connected item the linked item card shows, see `LinkedItemDetail`. */
export interface LinkedItemRef {
  board_id: string;
  board_name: string;
  item_id: string;
  view_id: string | null;
}

/** One field of a linked item card: a column of the connected board and the item's value in it. */
export interface LinkedItemField {
  id: string;
  label: string;
  type: BoardColumnKind;
  description: string | null;
  /** Status, label and dropdown labels. */
  options: StatusDef[];
  value: CellValue;
  /** Connect boards fields only: the names and group colors of the items it links. */
  linked_items?: { name: string; color: string | null }[];
  /** Rating fields only, see `ColumnDef.rating_max` and `ColumnDef.rating_icon`. */
  rating_max?: number;
  rating_icon?: RatingIcon;
}

/**
 * A connected item opened from a Connect boards cell (its card, monday style): where it lives,
 * its group and every field of its board, read on open from that board.
 */
export interface LinkedItemDetail {
  board_id: string;
  board_name: string;
  board_href: string;
  item_id: string;
  name: string;
  /** The item's own page, where its updates (the conversation) live. */
  href: string;
  group: { name: string; color: string };
  fields: LinkedItemField[];
}

/** Everything a Connect boards column's cells and picker read, fetched once per column. */
export interface ConnectColumnOptions {
  boards: ConnectBoardOption[];
  /** Connected boards the viewer may not open. */
  hidden_board_count: number;
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
  /** Connect-board kind only: the first of `linked_board_ids`, read by automations and mirrors that handle a single board. */
  linked_board_id?: string;
  /** Connect-board kind only: every board this column's cells link items on. */
  linked_board_ids?: string[];
  /** Connect-board kind only, see `ConnectSettings`. */
  connect?: ConnectSettings;
  /** Connect-board and Mirror kinds only: what the column is linked to, shown in the header's info popover. */
  linkage?: ColumnLinkage;
  /** Any kind: the "Column description" shown in the header's info popover. */
  description?: string;
  /** Any kind, see `ColumnValidation`'s own doc comment. */
  validation?: ColumnValidation;
  /** Number kind only: which aggregation the group summary row's footer shows for this column. Undefined behaves as `"sum"` (existing behavior). See `summaryUtils.ts`'s `summaryForColumn`. */
  aggregation?: "sum" | "avg" | "min" | "max" | "count";
  /** Button kind only: the text on the button and its color. */
  /** `is_set_up` is false while no automation watches the button, its cell then offers "Set up" instead of a press. */
  button?: { label: string; color: string; is_set_up?: boolean };
  /** Any kind: the column menu's "Hide column summary", leaves this column's cell in the group summary footer empty. */
  hide_summary?: boolean;
  /** Dependency kind only, see `DependencyConfig`. */
  dependency?: DependencyConfig;
  /** Dependency kind only: the Date and Timeline columns of the same table it can schedule, for its settings. */
  dependency_date_columns?: { id: string; title: string; kind: ColumnKind }[];
  /** Date kind only: notifies everyone assigned in a People column on the same item once the date is `days_before` days away — sent daily by the backend's `board:send-due-date-reminders` scheduled command. */
  reminder?: { enabled: boolean; days_before: number };
  /** Hour columns only, see `HourFormat`. Unset reads as 12 hour. */
  hour_format?: HourFormat;
  /** Rating columns only: how many icons the scale has (1 to 10). Unset reads as 5. */
  rating_max?: number;
  /** Rating columns only: the icon the scale is drawn with. Unset reads as a star. */
  rating_icon?: RatingIcon;
  /** Progress tracking columns only: the Status columns it tracks and how much each weighs. Unset tracks every Status column of its table with the same weight. */
  progress_columns?: ProgressColumnWeight[];
}

/** One Status column a Progress tracking column tracks, and its weight in percent (the weights add up to 100). */
export interface ProgressColumnWeight {
  column_id: string;
  weight: number;
}

/** The icons a Rating column can draw its scale with, see `ColumnDef.rating_icon`. */
export type RatingIcon = "star" | "heart" | "thumbs_up" | "smiley";

/**
 * How a Dependency column moves the dates it schedules, mirroring monday.com: `strict` keeps each
 * item exactly at its lag, `flexible` only pushes items later when a predecessor would break the
 * lag, `none` only shows the links.
 */
export type DependencyMode = "strict" | "flexible" | "none";

/** A link's type: finish to start, start to start, finish to finish, start to finish. Only a Timeline column tells them apart. */
export type DependencyLinkType = "fs" | "ss" | "ff" | "sf";

/** How an item is scheduled from one predecessor: `lag_days` after it (before it when negative). */
export interface DependencyLink {
  type: DependencyLinkType;
  lag_days: number;
}

/** One link sent when a Dependency cell is saved. A link without `lag_days` keeps the lag it had, or starts from the distance the two items already have. */
export interface DependencyLinkInput {
  predecessor_id: string;
  type?: DependencyLinkType;
  lag_days?: number | null;
}

/** A Dependency column's own settings, edited from its header menu. */
export interface DependencyConfig {
  /** The Date or Timeline column it schedules, null when none is picked. */
  date_column_id: string | null;
  mode: DependencyMode;
  /** Lags count working days of the board's calendar, skipping weekends and holidays. */
  use_working_days: boolean;
}

/** "Automate" in the column header menu: opens the automation builder for a column, and how many automations already use each column. */
export type ColumnAutomationShortcut = { counts: Record<string, number>; onOpen: (column_id: string) => void };

export interface StatusDef {
  id: string;
  label: string;
  color: string;
  fixed?: boolean;
  /** Deactivated labels stay on items that already have them but leave the picker. Defaults to true when omitted. */
  is_active?: boolean;
  /** Optional helper text, set from Edit Labels' "Add label description". */
  description?: string | null;
}

export interface TagDef {
  id: string;
  label: string;
  color: string;
  /** Items using the tag across every board the user can see, from the API. Omitted by the standalone demo. */
  usage_count?: number;
  /** True for a public tag that lives on another board and is shared with this one, editing it changes it everywhere. */
  is_shared?: boolean;
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
/** `file` is an upload kept in storage, `link` an external URL added through "From Link" or a cloud provider option, `doc` a Doc created from the cell. Entries saved before links existed have no `kind` and are uploads. */
export type CellFileKind = "file" | "link" | "doc";

/** Which Files menu option added a link. Links saved before providers existed have none and count as "link". */
export type CellFileSource = "link" | "google_drive" | "dropbox" | "box" | "onedrive";

export interface CellFile {
  id: string;
  kind?: CellFileKind;
  /** Links only. */
  source?: CellFileSource;
  /** Docs only, the Doc's navigation item id. */
  doc_id?: number;
  /** For a link, its display text (or the URL itself when none was given). For a Doc, its name. */
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
  | DocCellValue
  | null
  | undefined;

/** A Doc cell's own small document: its title and the editor JSON body (same format as a board Doc). */
export interface DocCellValue {
  title: string;
  content: string | null;
  updated_at?: string;
}

export interface BoardTableNode {
  id: string;
  name: string;
  values: Record<string, CellValue>;
  /** Item details the Creation log and Last updated columns show. Missing on rows built before they were loaded. */
  created_by_id?: string | null;
  created_at?: string | null;
  last_updated_by_id?: string | null;
  last_updated_at?: string | null;
  /** Total comments posted on this row (item or subitem) — drives the message-icon badge in `ItemRow`/`SubitemRow`. Undefined for the standalone mock demo, which has no backing comments drawer. */
  comment_count?: number;
  /** Flags this individual row (item or subitem) as a priority row — the per-row counterpart of `BoardTableGroup.is_priority`, independent of any per-item Status/Priority column. Renders a star next to the row's name in `ItemRow`/`SubitemRow`. */
  is_priority?: boolean;
  /** Each Dependency cell's link settings, keyed by column id then predecessor id. A predecessor missing here has no settings saved yet (lag 0). */
  dependency_links?: Record<string, Record<string, DependencyLink>>;
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
  /** Profile photo, drawn instead of the initials badge when it loads. */
  avatar_url?: string | null;
  /** Shown after the name in the People picker, "Name (Job title)". */
  job_title?: string | null;
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

/** The single cell currently focused for Excel-style keyboard navigation/copy-paste — see `useBoardTable`'s `moveActiveCell`/`copyActiveCell`/`pasteIntoActiveCell`. */
export interface ActiveCell {
  node_id: string;
  column_id: string;
}

/**
 * An in-progress "fill handle" drag (the little square at an active cell's
 * bottom-right corner) — dragging it down/up copies that cell's value into
 * every row the pointer passes over, mirroring Excel/Google Sheets. Confined
 * to a single column: `column_id` never changes once the drag starts.
 */
export interface FillDragState {
  column_id: string;
  anchor_node_id: string;
  hovered_node_id: string;
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
