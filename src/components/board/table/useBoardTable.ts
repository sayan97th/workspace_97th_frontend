"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveCell,
  CellFile,
  CellValue,
  ColumnDef,
  ColumnKind,
  ColumnValidation,
  DragState,
  FillDragState,
  FormulaConfig,
  MirrorConfig,
  PersonDef,
  ReorderPayload,
  SortState,
  StatusDef,
  TagDef,
  BoardTableGroup,
  BoardTableItem,
  BoardTableNode,
} from "./types";
import { buildInitialGroups } from "./mockData";
import {
  DEFAULT_LABEL_DEFS,
  DEFAULT_STATUS_DEFS,
  DEFAULT_TAG_DEFS,
  GROUP_PALETTE,
  PEOPLE,
  STATUS_PALETTE,
} from "./constants";
import {
  findGroup,
  findItem,
  findNode,
  insertItemIntoGroup,
  insertSubIntoItem,
  locateNode,
  removeNodeById,
  reorderWithinList,
  updateNodeById,
  visibleRowSequence,
} from "./treeUtils";

export type ColumnScope = "main" | "sub";

/**
 * In-flight column-header drag — the column-reorder analogue of `DragState`
 * (row drag). `origin_order` snapshots the dragged column's merged
 * base+custom id order (within `group_key`'s `scope`) at drag start, so
 * `onColumnDragEnd` can tell whether the drop actually changed anything
 * before reporting a `ReorderColumnsPayload`.
 */
export interface ColumnDragState {
  column_id: string;
  group_key: string;
  scope: ColumnScope;
  origin_order: string[];
}

/**
 * Reported by `onColumnDragEnd` once a column-header drag has actually
 * changed a scope's column order, for a real board to persist server-side
 * (see `UseBoardTableConfig.onReorderColumns`) — the column-header analogue
 * of `ReorderPayload` for rows. `ordered_ids` is that scope's full column id
 * order after the drop, left-to-right. Column order is shared across every
 * group rendering the same scope (every group's header shows the same
 * columns), so `group_key` only names which group's header the drag started
 * in, not a per-group order.
 */
export type ReorderColumnsPayload = {
  scope: ColumnScope;
  moved_id: string;
  group_key: string;
  ordered_ids: string[];
};

/** Every column list a `BoardTableGroup` carries — a dropdown's own `options` live on whichever one actually holds the column. */
const COLUMN_LIST_KEYS: Array<keyof Pick<BoardTableGroup, "base_columns" | "custom_columns" | "sub_base_columns" | "sub_custom_columns">> = [
  "base_columns",
  "custom_columns",
  "sub_base_columns",
  "sub_custom_columns",
];

/** The keys of every group currently flagged `true` in a `collapsed_groups` map — the wire format `onCollapsedGroupsChange` persists (see its own doc comment for why only the collapsed ones are sent). */
function collapsedGroupKeys(collapsed_groups: Record<string, boolean>): string[] {
  return Object.keys(collapsed_groups).filter((key) => collapsed_groups[key]);
}

/**
 * Applies `updater` to the one column matching `column_id`, wherever it lives
 * across every group's four column lists — a column definition (including
 * its `options`) is the same logical entity in every group/tab, so an option
 * edit/delete/add needs to land everywhere that column is rendered, not just
 * the group the triggering cell happened to be in (unlike a per-group action
 * such as `renameColumn`, which only patches the group named by its caller).
 */
function mapColumnInAllGroups(groups: BoardTableGroup[], column_id: string, updater: (column: ColumnDef) => ColumnDef): BoardTableGroup[] {
  return groups.map((g) => {
    let changed = false;
    const patch: Partial<BoardTableGroup> = {};
    for (const list_key of COLUMN_LIST_KEYS) {
      const list = g[list_key];
      const index = list.findIndex((c) => c.id === column_id);
      if (index < 0) continue;
      changed = true;
      const next_list = list.slice();
      next_list[index] = updater(list[index]);
      patch[list_key] = next_list;
    }
    return changed ? { ...g, ...patch } : g;
  });
}

/**
 * Bridges `BoardTable` to a real, API-backed board. Omitted entirely, the
 * hook behaves exactly like the standalone demo (mock data, no persistence).
 * Passed in (see `TableBoardView.tsx`), `initial_groups`/`people`/
 * `status_defs` seed the hook's local state from real data and re-sync it
 * whenever the caller's data changes, while the `on*` callbacks fire
 * alongside the matching local update so the change is also persisted.
 * Structural creation (add item/subitem/group) instead goes through the
 * `preset_id`/`preset_key` parameters on `addItem`/`addSubitem`/`addGroup`
 * below — the caller awaits the real API call first and only then adds the
 * row locally under its real id, so no local-id-to-real-id reconciliation is
 * ever needed.
 */
export interface UseBoardTableConfig {
  initial_groups?: BoardTableGroup[];
  people?: PersonDef[];
  status_defs?: StatusDef[];
  /**
   * The Tags column's board-wide option list — shared across every Tags
   * column on the board (unlike Status/Dropdown, whose options live per-
   * column, see `status_defs`/`ColumnDef.options`), mirroring monday.com's
   * own Tags column. Omitted, `BoardTable` falls back to the standalone
   * demo's local-only `DEFAULT_TAG_DEFS`.
   */
  tag_defs?: TagDef[];
  /**
   * Tags cell's own "Create new tag" / "Manage tags" modal's "Add" — resolves
   * with the persisted tag (its real id included) once the board's next
   * `tag_defs` sync would otherwise reflect it, so a cell that just created a
   * tag can select it immediately rather than waiting a render. Omitted (the
   * standalone demo), `addTagDef`/`createTagOnCell` fall back to a local-only
   * id instead.
   */
  onCreateTagDef?: (label: string) => Promise<TagDef>;
  /** "Manage tags" modal's color swatch — see `onCreateTagDef`'s own doc comment for the real-vs-demo split. */
  onRecolorTagDef?: (id: string, color: string) => void;
  /** "Manage tags" modal's delete "×" — see `onCreateTagDef`'s own doc comment. */
  onDeleteTagDef?: (id: string) => void;
  /**
   * Fetches the display name of every item on a Connect-board column's
   * linked board, for both the closed cell's own name chips and its
   * `ConnectBoardMenu` popover — called at most once per `linked_board_id`
   * (see `ensureLinkedBoardItems`), so every Connect-board cell/column
   * pointing at the same linked board shares one fetch. Omitted (the
   * standalone demo, which has no other board to link to), a Connect-board
   * cell just shows its raw linked count with no names.
   */
  onFetchLinkedBoardItems?: (linked_board_id: string) => Promise<{ id: string; name: string }[]>;
  /** The signed-in viewer's own id — a `vote`-type cell toggles this id in/out of its value array, and highlights itself when the viewer has already voted. Undefined for the standalone demo, which has no signed-in viewer. */
  current_user_id?: string;
  onRenameNode?: (node_id: string, name: string) => void;
  onCellValueChange?: (node_id: string, column_id: string, value: CellValue) => void;
  /**
   * A `files`-type cell's "Upload" button — persists the given files and
   * resolves with that cell's *entire* updated file list (existing files
   * plus the newly uploaded ones), which the hook then writes into local
   * state directly (unlike `onCellValueChange`, this is the one write of
   * that value, so it isn't fired again for the same change). Omitted, the
   * cell's Upload button still opens the file picker but silently no-ops.
   */
  onUploadCellFiles?: (node_id: string, column_id: string, files: File[]) => Promise<CellFile[]>;
  /** A `files`-type cell's per-chip delete "×" — resolves with the cell's updated file list, same contract as `onUploadCellFiles`. */
  onDeleteCellFile?: (node_id: string, column_id: string, file_id: string) => Promise<CellFile[]>;
  /**
   * Row star / row menu's "Mark as priority" toggle for a single item or
   * subitem — the per-row counterpart of `onToggleGroupPriority`, persisted
   * server-side the same way so it's shared across every viewer.
   */
  onToggleNodePriority?: (node_id: string, is_priority: boolean) => void;
  /** Row menu's "Set recurring..." popover, root items only — see `BoardTableNode.recurrence`. */
  onSetItemRecurrence?: (node_id: string, recurrence: { frequency: "daily" | "weekly" | "monthly"; interval_count: number }) => void;
  /** Row menu's "Stop recurring" action. */
  onClearItemRecurrence?: (node_id: string) => void;
  /**
   * Appends a new option to a real Dropdown column's `options`, inline from
   * its own cell picker (the "New label" + Add row) — resolves once
   * persisted; the board's next `initial_groups` sync then reflects it.
   * Omitted (the standalone demo), the option is added to the shared,
   * local-only `label_defs` palette instead, mirroring `addLabelDef`.
   */
  onAddColumnOption?: (column_id: string, option: { label: string; color: string }) => Promise<unknown>;
  /** Renames one of a real column's own existing options — see `onAddColumnOption`'s own doc comment for the add case. */
  onRenameColumnOption?: (column_id: string, option_id: string, label: string) => void;
  /** Recolors one of a real column's own existing options. */
  onRecolorColumnOption?: (column_id: string, option_id: string, color: string) => void;
  /** Permanently removes one of a real column's own existing options. */
  onDeleteColumnOption?: (column_id: string, option_id: string) => void;
  /**
   * People cell picker's bottom toggle — flips whether assigning someone on
   * this column notifies them (in-app + email), persisted to the real
   * column's `config.notify_on_assignment`. Omitted (the standalone demo,
   * which has no backing notification pipeline), the toggle itself never
   * renders — see `ColumnDef.notify_on_assignment`.
   */
  onToggleColumnNotifyOnAssignment?: (column_id: string) => void;
  /** Formula settings modal's "Save" — see `ColumnDef.formula`. */
  onUpdateColumnFormula?: (column_id: string, formula: FormulaConfig) => void;
  /** Connect-board settings modal's "Save" — see `ColumnDef.linked_board_id`. */
  onUpdateColumnLinkedBoard?: (column_id: string, linked_board_id: string) => void;
  /** Mirror settings modal's "Save" — see `ColumnDef.mirror`. */
  onUpdateColumnMirror?: (column_id: string, mirror: MirrorConfig) => void;
  onDeleteNode?: (node_id: string) => void;
  /**
   * The shareable link the row menu's "Copy item link" puts on the clipboard,
   * the real board's `/boards/{board_id}/pulses/{item_id}` deep link that
   * opens the item's drawer. Omitted (the standalone demo), the link falls
   * back to the current page with the node id as its hash.
   */
  getNodeLink?: (node_id: string) => string;
  /**
   * Fires once per completed drag that actually changed a list's order — a
   * table's own root items reordered within their group, or one item's
   * subitems reordered within it (see `ReorderPayload`). The local drag
   * reorder (`onDragOver`) has already applied optimistically by the time
   * this fires; a real board persists it server-side (`reorderItems`) and,
   * on failure, rolls the local order back through its own `initial_groups`.
   * Omitted, a drag still reorders locally but nothing is ever persisted.
   */
  onReorderItems?: (payload: ReorderPayload) => void;
  /**
   * Fires once per completed column-header drag that actually changed a
   * scope's column order (main table header or subitem header) — the
   * column-header analogue of `onReorderItems`. The local drag reorder
   * (`onColumnDragOver`) has already applied optimistically by the time this
   * fires; a real board persists it server-side (`reorderColumns`) and, on
   * failure, rolls the local order back through its own `initial_groups`.
   * Omitted, a column drag still reorders locally but nothing is ever
   * persisted.
   */
  onReorderColumns?: (payload: ReorderColumnsPayload) => void;
  onRenameGroup?: (group_key: string, title: string) => void;
  onRemoveGroup?: (group_key: string) => void;
  /**
   * Group menu's "Delete group" asks the caller to confirm first: when this is
   * set, `removeGroup` only reports the request here and leaves the group in
   * place, and the caller runs its own confirmation and the real delete
   * (feeding the result back through `initial_groups`). Omitted, `removeGroup`
   * deletes right away and reports it through `onRemoveGroup`.
   */
  onRequestRemoveGroup?: (group_key: string) => void;
  /**
   * Group menu's "Archive group", hides the table without deleting it. The
   * caller persists it and stops feeding the group back through
   * `initial_groups`, so it stays hidden.
   */
  onArchiveGroup?: (group_key: string) => void;
  /** Group menu's "Change group color", `color` is a `#rrggbb` value from `GROUP_PALETTE`. */
  onChangeGroupColor?: (group_key: string, color: string) => void;
  /**
   * Group menu's "Move group" (top, up, down, bottom). `ordered_group_keys` is
   * the whole table order after the move, so the caller can persist the moved
   * group's new slot without replaying the direction.
   */
  onMoveGroup?: (group_key: string, ordered_group_keys: string[]) => void;
  /**
   * Group menu / header star's "Mark as priority client" toggle — persists
   * server-side so the flag (and the "their tasks sort above all" ordering
   * it drives) is shared across every viewer, not just a local UI state.
   */
  onToggleGroupPriority?: (group_key: string, is_priority: boolean) => void;
  /**
   * Persisted collapse/expand state for every group (table) on this view,
   * keyed the same way `BoardTableState.collapsed_groups` is — undefined for
   * the standalone demo, which always starts fully expanded. A real board
   * loads back whichever tables the viewer had collapsed the last time they
   * visited, so a board with dozens or hundreds of tables lands exactly where
   * they left it instead of every table snapping open again.
   */
  initial_collapsed_groups?: Record<string, boolean>;
  /**
   * Persists the viewer's collapsed/expanded set — fired by
   * `toggleGroupCollapsed`/`collapseAllGroups`/`expandAllGroups` with the
   * *entire* resulting set of collapsed group keys (not just the one that
   * changed), mirroring `onResizeItemColumn`'s "always send the final value"
   * style rather than a diff. Sending the full set keeps a bulk action
   * (`collapseAllGroups`) correct in one call, and stays cheap even with
   * hundreds of tables since only the (typically few) *collapsed* ones are
   * ever included — an expanded table costs nothing to represent.
   */
  onCollapsedGroupsChange?: (collapsed_group_keys: string[]) => void;
  /** Column-header menu — see `ColumnMenu.tsx`. Each acts on an *existing* column id, so it's called alongside the local mutation (no round trip needed first), mirroring `onRenameGroup`/`onRemoveGroup`. */
  onRenameColumn?: (group_key: string, scope: ColumnScope, column_id: string, title: string) => void;
  onDeleteColumn?: (group_key: string, scope: ColumnScope, column_id: string) => void;
  onUpdateColumnSettings?: (
    group_key: string,
    scope: ColumnScope,
    column_id: string,
    patch: {
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
    }
  ) => void;
  onChangeColumnKind?: (group_key: string, scope: ColumnScope, column_id: string, kind: ColumnKind, default_width: number) => void;
  /**
   * Persisted width (px) for the item-title virtual column (the "Item"/"Task"
   * header spanning the name + person cells) — undefined for the standalone
   * demo, which always auto-sizes instead (see `BoardTable`'s `name_col_width`).
   * Null means the real board has never had this column resized yet, so it
   * still auto-sizes until the user drags its handle for the first time.
   */
  initial_item_column_width?: number | null;
  /**
   * Persists the item-title column's resized width — the real-board analogue
   * of `onUpdateColumnSettings`, needed separately because this column isn't a
   * real `board_columns` row (it lives on the board itself, like `item_column_label`).
   */
  onResizeItemColumn?: (width: number) => void;
  /**
   * Persisted width (px) for the subitem-title virtual column, board-wide
   * across every item's subitem tree — the subitem-tree analogue of
   * `initial_item_column_width`. Null means it still auto-sizes per item
   * from that item's own longest subitem name (see `computeSubNameColWidth`).
   */
  initial_sub_column_width?: number | null;
  /** Persists the subitem-title column's resized width — the subitem-tree analogue of `onResizeItemColumn`. */
  onResizeSubColumn?: (width: number) => void;
  /**
   * Opens a real board's comments drawer for one row (item or subitem) —
   * fired by the row's message-icon button (see `ItemRow`/`SubitemRow`).
   * The table engine itself has no comments UI of its own, so this just
   * hands the node id up to the caller, which owns the actual drawer (e.g.
   * `useBoardItemDrawer`) and resolves the row from its own real data.
   * Omitted (the standalone demo), the button renders but stays inert.
   */
  onOpenComments?: (node_id: string) => void;
  /**
   * Opens a real board's item detail panel for one row (item or subitem),
   * fired by the row's own hover-reveal expand button (see `ItemRow`/
   * `SubitemRow`) rather than the message icon that `onOpenComments` reacts
   * to, so a row can be opened without landing on the Updates tab
   * specifically. The table engine itself has no detail panel of its own,
   * so this just hands the node id up to the caller, exactly like
   * `onOpenComments`. Omitted (the standalone demo), the button renders but
   * stays inert.
   */
  onOpenItem?: (node_id: string) => void;
  /**
   * Fired at most once per table (group) whose `is_items_loaded` is
   * `false`, when `GroupSection`'s own `IntersectionObserver` sees it
   * scroll near the viewport — the caller resolves this by fetching that
   * table's rows (`boardContentService.getItems(..., [group_id])`) and
   * merging them into whatever real data feeds `initial_groups`, which
   * flips `is_items_loaded` to `true` once it re-syncs. Omitted (the
   * standalone demo, and any caller whose groups don't set
   * `is_items_loaded` in the first place), this never fires.
   */
  onRequestGroupItems?: (group_key: string) => void;
  /**
   * Row density preset from the board toolbar's "Item height" control
   * (`OverflowControl`/`toolbar.row_height`) — read-only here, `BoardTable`
   * never mutates it back. Omitted (the standalone demo), rows render at
   * the default `"single"` height.
   */
  row_height?: "single" | "double" | "triple" | "quad";
  /** Row-id → color, from the toolbar's Conditional coloring rules scoped to "row" — see `row_height`'s own doc comment for the same read-only, toolbar-owned pattern. */
  row_colors?: Record<string, string>;
  /** Row-id → column-id → color, from the toolbar's Conditional coloring rules scoped to "cell". */
  cell_colors?: Record<string, Record<string, string>>;
  /**
   * How many of `base_columns` (leading ones, immediately after the Item
   * column) the board toolbar's "Choose columns to pin" control has pinned.
   * `TableBoardView` already reorders pinned columns to the front of the
   * list it hands `BoardTable`, so a count is all this needs to know which
   * ones to freeze. Those columns, plus the Item column itself, render with
   * `position: sticky` so they stay on screen while the rest of the table
   * scrolls horizontally. Omitted (the standalone demo), only the Item
   * column freezes.
   */
  pinned_column_count?: number;
  /**
   * The toolbar search's currently active match (Ctrl/Cmd+F "N of M" jump
   * navigation), read-only here like `row_colors`/`cell_colors` above.
   * `column_id` is `"__name"` for a match in the item-title virtual column,
   * mirroring `onRequestColumnSort`'s own convention. Null/omitted when the
   * search box is closed or has no matches.
   */
  active_search_match?: { node_id: string; column_id: string } | null;
  /** The toolbar's current search text, only used to highlight the matching substring in the item-title span — see `active_search_match`. */
  search_query?: string;
  /**
   * True for a user who may open and browse this board but not edit it (a
   * workspace `viewer`, e.g. a board-invited guest, see `BoardEditGate`
   * server-side). Every mutating action on `actions` becomes a no-op (the
   * guard lives at the end of this hook, see `READ_ONLY_SAFE_ACTIONS`); this
   * flag itself only drives cosmetic hiding of edit affordances (Add item/
   * subitem/group rows, the row "..." menu trigger, row drag) that would
   * otherwise do nothing when clicked.
   */
  read_only?: boolean;
  /**
   * Board permissions: false when the viewer may edit items but not the
   * board's structure ("Edit content" or "Assigned items only", see
   * `BoardEditGate` server-side). Column and group actions become no-ops,
   * see `STRUCTURE_ACTIONS`. Defaults to true.
   */
  can_edit_structure?: boolean;
  /** Board permissions: false when the viewer may not add new items ("Assigned items only"). Defaults to true. */
  can_create_items?: boolean;
  /** Board permissions ("Assigned items only"): whether the viewer may edit this row. Every row is editable when omitted. */
  canEditNode?: (node_id: string) => boolean;
  /** Column permissions: whether the viewer may edit this column's cells. Every column is editable when omitted. */
  canEditColumn?: (column_id: string) => boolean;
}

export interface BoardTableState {
  groups: BoardTableGroup[];
  people: PersonDef[];
  open_map: Record<string, boolean>;
  collapsed_groups: Record<string, boolean>;
  selected_map: Record<string, boolean>;
  editing_id: string | null;
  edit_draft: string;
  editing_group_key: string | null;
  group_draft: string;
  /** The header cell currently in inline-rename mode, identified by its `scoped_key` (see `ColumnHeaderCell`) — null for both real columns and the item-title/sub-title virtual columns when none is being edited. */
  editing_column: { scoped_key: string; group_key: string; scope: ColumnScope; column_id: string | null } | null;
  column_draft: string;
  hover_row_id: string | null;
  hover_group_key: string | null;
  hover_head_key: string | null;
  open_row_menu_id: string | null;
  open_group_menu_key: string | null;
  open_column_menu_key: string | null;
  open_cell_menu_key: string | null;
  open_owner_menu_key: string | null;
  open_picker_key: string | null;
  picker_query: string;
  people_query: string;
  tag_query: string;
  status_defs: StatusDef[];
  label_defs: StatusDef[];
  tag_defs: TagDef[];
  label_editor_kind: "status" | "label" | null;
  /**
   * The real column being edited, when the editor was opened from a real
   * (API-backed) column's cell — see `openLabelEditor`. Null for the
   * standalone mock demo's shared `status_defs`/`label_defs` palette.
   */
  label_editor_column_id: string | null;
  /**
   * The Formula/Mirror/Connect-board column currently being configured from
   * its header menu's "Configure ..." row (see `ColumnMenu`'s `onEditFormula`/
   * `onEditMirror`/`onEditConnectBoard`) — mirrors `label_editor_kind`'s own
   * "which modal, for which column" shape. Null closes every such modal.
   */
  config_editor: { kind: "formula" | "mirror" | "connect_board"; column_id: string } | null;
  tag_editor_open: boolean;
  /**
   * Cache of every Connect-board column's linked-board item names, keyed by
   * `linked_board_id` — populated at most once per board id by
   * `ensureLinkedBoardItems`, and shared by every Connect-board cell/column
   * pointing at that same linked board (both the closed cell's own name
   * chips and its `ConnectBoardMenu` popover read from here). An absent key
   * means "not fetched yet" (renders a loading state); an empty array means
   * "fetched, the linked board has no items".
   */
  connect_board_items: Record<string, { id: string; name: string }[]>;
  drag: DragState | null;
  /** In-flight column-header drag — see `ColumnDragState`'s own doc comment. */
  column_drag: ColumnDragState | null;
  sort: SortState | null;
  copied_row_id: string | null;
  /** Explicit width (px) for the item-title virtual column, once the user has dragged its resize handle — null falls back to `BoardTable`'s auto-sizing from the longest item name. */
  item_column_width: number | null;
  /** Explicit width (px) for the subitem-title virtual column, once the user has dragged its resize handle — null falls back to `GroupSection`'s per-item auto-sizing from that item's longest subitem name. */
  sub_column_width: number | null;
  /** Row density preset — see `UseBoardTableConfig.row_height`'s own doc comment. */
  row_height: "single" | "double" | "triple" | "quad";
  /** Row-id → color — see `UseBoardTableConfig.row_colors`'s own doc comment. */
  row_colors: Record<string, string>;
  /** Row-id → column-id → color — see `UseBoardTableConfig.cell_colors`'s own doc comment. */
  cell_colors: Record<string, Record<string, string>>;
  /** Leading pinned/frozen column count, see `UseBoardTableConfig.pinned_column_count`'s own doc comment. */
  pinned_column_count: number;
  /** See `UseBoardTableConfig.active_search_match`'s own doc comment. */
  active_search_match: { node_id: string; column_id: string } | null;
  /** See `UseBoardTableConfig.search_query`'s own doc comment. */
  search_query: string;
  /** See `UseBoardTableConfig.read_only`'s own doc comment. */
  read_only: boolean;
  /** See `UseBoardTableConfig.can_edit_structure`. Hides the "Add new group" button when false. */
  can_edit_structure: boolean;
  /** See `UseBoardTableConfig.can_create_items`. Hides the "Add item" rows when false. */
  can_create_items: boolean;
  /** The cell focused for Excel-style keyboard navigation/copy-paste — see `ActiveCell`'s own doc comment. */
  active_cell: ActiveCell | null;
  /** The last cell copied via `copyActiveCell` (Ctrl/Cmd+C) — `null` once nothing has been copied yet this session. */
  clipboard_cell: { value: CellValue } | null;
  /** An in-progress fill-handle drag — see `FillDragState`'s own doc comment. */
  fill_drag: FillDragState | null;
  /** See `UseBoardTableConfig.current_user_id`'s own doc comment. */
  current_user_id: string | null;
  /**
   * Ctrl/Cmd+Z undo stack — each entry re-runs the same local-mutation-plus-
   * server-callback action a cell edit/rename/priority toggle already used
   * (see `pushHistory`), just with the value flipped back to what it was
   * before. Scoped to a handful of the most common, safely-reversible edits
   * (cell values, item/group renames, priority toggles) — structural changes
   * (add/delete/move/reorder a row, group or column) deliberately have no
   * undo entry, since reversing those would need their own server round
   * trip this stack doesn't model.
   */
  history_past: HistoryEntry[];
  /** Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y redo stack — see `history_past`'s own doc comment. */
  history_future: HistoryEntry[];
}

/** One undo-able edit — see `BoardTableState.history_past`'s own doc comment. */
interface HistoryEntry {
  undo: () => void;
  redo: () => void;
}

/** How many edits `history_past`/`history_future` each keep before the oldest is dropped. */
const HISTORY_LIMIT = 50;

function initialState(config: UseBoardTableConfig): BoardTableState {
  const is_controlled = Boolean(config.initial_groups);
  return {
    groups: config.initial_groups ?? buildInitialGroups(),
    people: config.people ?? PEOPLE,
    // A real board's rows load collapsed and unselected — only the mock demo
    // opens/selects a couple of rows up front to show the tree off at a glance.
    open_map: is_controlled ? {} : { i1: true, i3: true },
    collapsed_groups: config.initial_collapsed_groups ?? {},
    selected_map: is_controlled ? {} : { "i3-s2": true },
    editing_id: null,
    edit_draft: "",
    editing_group_key: null,
    group_draft: "",
    editing_column: null,
    column_draft: "",
    hover_row_id: null,
    hover_group_key: null,
    hover_head_key: null,
    open_row_menu_id: null,
    open_group_menu_key: null,
    open_column_menu_key: null,
    open_cell_menu_key: null,
    open_owner_menu_key: null,
    open_picker_key: null,
    picker_query: "",
    people_query: "",
    tag_query: "",
    status_defs: config.status_defs ?? DEFAULT_STATUS_DEFS.slice(),
    label_defs: DEFAULT_LABEL_DEFS.slice(),
    tag_defs: config.tag_defs ?? DEFAULT_TAG_DEFS.slice(),
    label_editor_kind: null,
    label_editor_column_id: null,
    config_editor: null,
    tag_editor_open: false,
    connect_board_items: {},
    drag: null,
    column_drag: null,
    sort: null,
    copied_row_id: null,
    item_column_width: config.initial_item_column_width ?? null,
    sub_column_width: config.initial_sub_column_width ?? null,
    row_height: config.row_height ?? "single",
    row_colors: config.row_colors ?? {},
    cell_colors: config.cell_colors ?? {},
    pinned_column_count: config.pinned_column_count ?? 0,
    active_search_match: config.active_search_match ?? null,
    search_query: config.search_query ?? "",
    read_only: config.read_only ?? false,
    can_edit_structure: config.can_edit_structure ?? true,
    can_create_items: config.can_create_items ?? true,
    active_cell: null,
    clipboard_cell: null,
    fill_drag: null,
    current_user_id: config.current_user_id ?? null,
    history_past: [],
    history_future: [],
  };
}

const closeAllMenus = {
  open_row_menu_id: null,
  open_group_menu_key: null,
  open_column_menu_key: null,
  open_cell_menu_key: null,
  open_owner_menu_key: null,
  open_picker_key: null,
};

export function useBoardTable(config: UseBoardTableConfig = {}) {
  const [state, setState] = useState<BoardTableState>(() => initialState(config));
  const seq_ref = useRef(0);
  const nextId = useCallback((prefix: string) => {
    seq_ref.current += 1;
    return `${prefix}-n${seq_ref.current}`;
  }, []);

  // Latest-value ref so the `on*` callbacks below always call the caller's
  // current config without forcing every action creator to depend on (and
  // therefore be recreated whenever) `config` itself.
  const config_ref = useRef(config);
  config_ref.current = config;
  // Same latest-value pattern, so a `useCallback([])`-memoized action can read
  // the current state synchronously (e.g. to know which node it's committing
  // a rename for) without depending on — and being recreated by — `state`.
  const state_ref = useRef(state);
  state_ref.current = state;

  /** Records one undo-able edit — see `BoardTableState.history_past`'s own doc comment. Any new edit clears the redo stack, mirroring every other editor's undo/redo convention. */
  const pushHistory = useCallback((entry: HistoryEntry) => {
    setState((s) => ({ ...s, history_past: [...s.history_past.slice(-(HISTORY_LIMIT - 1)), entry], history_future: [] }));
  }, []);

  /** Ctrl/Cmd+Z. */
  const undo = useCallback(() => {
    const entry = state_ref.current.history_past.at(-1);
    if (!entry) return;
    entry.undo();
    setState((s) => ({ ...s, history_past: s.history_past.slice(0, -1), history_future: [...s.history_future, entry].slice(-HISTORY_LIMIT) }));
  }, []);

  /** Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y. */
  const redo = useCallback(() => {
    const entry = state_ref.current.history_future.at(-1);
    if (!entry) return;
    entry.redo();
    setState((s) => ({ ...s, history_future: s.history_future.slice(0, -1), history_past: [...s.history_past, entry].slice(-HISTORY_LIMIT) }));
  }, []);

  // Re-syncs local state whenever the caller's real data changes underneath
  // it (a refetch, another viewer's edit, ...) — skipped while a rename or
  // drag is in flight so an in-flight local edit can't get yanked out from
  // under the user, mirroring `BoardKanban`'s own re-sync guard.
  useEffect(() => {
    if (!config.initial_groups) return;
    setState((s) => {
      if (s.editing_id || s.drag || s.column_drag) return s;
      const next_groups = config.initial_groups!;
      // Drops any `selected_map` entry whose row no longer exists in the
      // fresh tree — the selection action bar's bulk move/archive/delete all
      // land here (the caller's own `items` state changes, which flows back
      // in as `initial_groups`), so a moved/archived/deleted row's checkbox
      // state doesn't linger and keep it counted in "N selected" forever.
      const next_selected: Record<string, boolean> = {};
      for (const id of Object.keys(s.selected_map)) {
        if (s.selected_map[id] && findNode(next_groups, id)) next_selected[id] = true;
      }
      // Same idea for the active cell — a row removed out from under it
      // (deleted, bulk-archived, ...) shouldn't leave a highlighted cell that
      // arrow keys/copy/paste keep silently no-op'ing against.
      const next_active_cell = s.active_cell && findNode(next_groups, s.active_cell.node_id) ? s.active_cell : null;
      return { ...s, groups: next_groups, selected_map: next_selected, active_cell: next_active_cell };
    });
  }, [config.initial_groups]);

  useEffect(() => {
    if (config.people) setState((s) => ({ ...s, people: config.people! }));
  }, [config.people]);

  useEffect(() => {
    if (config.current_user_id !== undefined) setState((s) => ({ ...s, current_user_id: config.current_user_id! }));
  }, [config.current_user_id]);

  useEffect(() => {
    if (config.status_defs) setState((s) => ({ ...s, status_defs: config.status_defs! }));
  }, [config.status_defs]);

  useEffect(() => {
    if (config.tag_defs) setState((s) => ({ ...s, tag_defs: config.tag_defs! }));
  }, [config.tag_defs]);

  useEffect(() => {
    if (config.row_height) setState((s) => ({ ...s, row_height: config.row_height! }));
  }, [config.row_height]);

  useEffect(() => {
    if (config.row_colors) setState((s) => ({ ...s, row_colors: config.row_colors! }));
  }, [config.row_colors]);

  useEffect(() => {
    if (config.cell_colors) setState((s) => ({ ...s, cell_colors: config.cell_colors! }));
  }, [config.cell_colors]);

  useEffect(() => {
    if (config.pinned_column_count !== undefined) setState((s) => ({ ...s, pinned_column_count: config.pinned_column_count! }));
  }, [config.pinned_column_count]);

  useEffect(() => {
    setState((s) => ({ ...s, active_search_match: config.active_search_match ?? null }));
  }, [config.active_search_match]);

  useEffect(() => {
    if (config.search_query !== undefined) setState((s) => ({ ...s, search_query: config.search_query! }));
  }, [config.search_query]);

  useEffect(() => {
    setState((s) => ({ ...s, read_only: config.read_only ?? false }));
  }, [config.read_only]);

  useEffect(() => {
    setState((s) => ({ ...s, can_edit_structure: config.can_edit_structure ?? true, can_create_items: config.can_create_items ?? true }));
  }, [config.can_edit_structure, config.can_create_items]);

  // `initial_item_column_width` is legitimately `null` (a real board that's
  // never had this column resized), so the resync guard checks for the key
  // being passed at all rather than truthiness — mirrors the other resync
  // effects' pattern of skipping entirely for the standalone demo.
  useEffect(() => {
    if (config.initial_item_column_width === undefined) return;
    setState((s) => ({ ...s, item_column_width: config.initial_item_column_width ?? null }));
  }, [config.initial_item_column_width]);

  useEffect(() => {
    if (config.initial_sub_column_width === undefined) return;
    setState((s) => ({ ...s, sub_column_width: config.initial_sub_column_width ?? null }));
  }, [config.initial_sub_column_width]);

  useEffect(() => {
    if (config.initial_collapsed_groups === undefined) return;
    setState((s) => ({ ...s, collapsed_groups: config.initial_collapsed_groups! }));
  }, [config.initial_collapsed_groups]);

  // ---- expand / select / edit -------------------------------------------------

  const toggleItemOpen = useCallback((id: string) => {
    setState((s) => ({ ...s, open_map: { ...s.open_map, [id]: !s.open_map[id] } }));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setState((s) => ({ ...s, selected_map: { ...s.selected_map, [id]: !s.selected_map[id] } }));
  }, []);

  /** Selection action bar's "×" — deselects every row without touching anything else. */
  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, selected_map: {} }));
  }, []);

  const toggleGroupCollapsed = useCallback((key: string) => {
    const collapsed_groups = { ...state_ref.current.collapsed_groups, [key]: !state_ref.current.collapsed_groups[key] };
    setState((s) => ({ ...s, collapsed_groups }));
    config_ref.current.onCollapsedGroupsChange?.(collapsedGroupKeys(collapsed_groups));
  }, []);

  const startEditName = useCallback((id: string, current_name: string) => {
    setState((s) => ({ ...s, editing_id: id, edit_draft: current_name, ...closeAllMenus }));
  }, []);

  const updateEditDraft = useCallback((value: string) => {
    setState((s) => ({ ...s, edit_draft: value }));
  }, []);

  /** Applies a node's new name to local state and the real board — the shared "do" half of `commitEditName`'s own action and its undo/redo entries. */
  const applyNodeName = useCallback((node_id: string, name: string) => {
    setState((s) => ({ ...s, groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, name })) }));
    config_ref.current.onRenameNode?.(node_id, name);
  }, []);

  const commitEditName = useCallback(() => {
    const editing_id = state_ref.current.editing_id;
    if (!editing_id) return;
    const name = (state_ref.current.edit_draft || "").trim() || "Untitled";
    const previous_name = findNode(state_ref.current.groups, editing_id)?.name;
    setState((s) => ({ ...s, editing_id: null }));
    if (previous_name !== undefined && previous_name !== name) {
      pushHistory({ undo: () => applyNodeName(editing_id, previous_name), redo: () => applyNodeName(editing_id, name) });
    }
    applyNodeName(editing_id, name);
  }, [applyNodeName, pushHistory]);

  const cancelEditName = useCallback(() => {
    setState((s) => ({ ...s, editing_id: null }));
  }, []);

  const startGroupRename = useCallback((key: string, title: string) => {
    setState((s) => ({ ...s, editing_group_key: key, group_draft: title, open_group_menu_key: null }));
  }, []);

  const updateGroupDraft = useCallback((value: string) => {
    setState((s) => ({ ...s, group_draft: value }));
  }, []);

  /** Applies a group's new title to local state and the real board — see `applyNodeName`'s own doc comment. */
  const applyGroupTitle = useCallback((group_key: string, title: string) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.key === group_key ? { ...g, title } : g)) }));
    config_ref.current.onRenameGroup?.(group_key, title);
  }, []);

  const commitGroupRename = useCallback(() => {
    const editing_group_key = state_ref.current.editing_group_key;
    if (!editing_group_key) return;
    const title = (state_ref.current.group_draft || "").trim() || "Untitled group";
    const previous_title = state_ref.current.groups.find((g) => g.key === editing_group_key)?.title;
    setState((s) => ({ ...s, editing_group_key: null }));
    if (previous_title !== undefined && previous_title !== title) {
      pushHistory({ undo: () => applyGroupTitle(editing_group_key, previous_title), redo: () => applyGroupTitle(editing_group_key, title) });
    }
    applyGroupTitle(editing_group_key, title);
  }, [applyGroupTitle, pushHistory]);

  const cancelGroupRename = useCallback(() => {
    setState((s) => ({ ...s, editing_group_key: null }));
  }, []);

  /** Applies a node's new priority flag to local state and the real board — see `applyNodeName`'s own doc comment. */
  const applyNodePriority = useCallback((node_id: string, is_priority: boolean) => {
    setState((s) => ({ ...s, groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, is_priority })) }));
    config_ref.current.onToggleNodePriority?.(node_id, is_priority);
  }, []);

  const toggleNodePriority = useCallback(
    (node_id: string) => {
      const previous_is_priority = !!findNode(state_ref.current.groups, node_id)?.is_priority;
      const next_is_priority = !previous_is_priority;
      setState((s) => ({ ...s, open_row_menu_id: null }));
      pushHistory({ undo: () => applyNodePriority(node_id, previous_is_priority), redo: () => applyNodePriority(node_id, next_is_priority) });
      applyNodePriority(node_id, next_is_priority);
    },
    [applyNodePriority, pushHistory]
  );

  /** Row menu's "Set recurring..." popover — no undo/redo, a scheduling side-effect rather than a visible cell edit, mirroring `openComments`/`openItem`. */
  const setItemRecurrence = useCallback((node_id: string, recurrence: { frequency: "daily" | "weekly" | "monthly"; interval_count: number }) => {
    setState((s) => ({ ...s, groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, recurrence })), open_row_menu_id: null }));
    config_ref.current.onSetItemRecurrence?.(node_id, recurrence);
  }, []);

  /** Row menu's "Stop recurring" action. */
  const clearItemRecurrence = useCallback((node_id: string) => {
    setState((s) => ({ ...s, groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, recurrence: null })), open_row_menu_id: null }));
    config_ref.current.onClearItemRecurrence?.(node_id);
  }, []);

  // ---- cell values --------------------------------------------------------

  /** Applies a cell's new value to local state and the real board — see `applyNodeName`'s own doc comment. */
  const applyCellValue = useCallback((node_id: string, column_id: string, value: CellValue) => {
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, values: { ...n.values, [column_id]: value } })),
    }));
    config_ref.current.onCellValueChange?.(node_id, column_id, value);
  }, []);

  const setCellValue = useCallback(
    (node_id: string, column_id: string, value: CellValue) => {
      const previous_value = findNode(state_ref.current.groups, node_id)?.values[column_id] ?? null;
      pushHistory({ undo: () => applyCellValue(node_id, column_id, previous_value), redo: () => applyCellValue(node_id, column_id, value) });
      applyCellValue(node_id, column_id, value);
    },
    [applyCellValue, pushHistory]
  );

  const toggleArrayValue = useCallback(
    (node_id: string, column_id: string, option: string) => {
      // Computed synchronously from `state_ref` up front (mirroring `commitEditName`'s
      // own pattern below) rather than inside the `setState` updater — React doesn't
      // guarantee that updater runs before the `onCellValueChange` call right after it,
      // so a value captured via an outer-scope variable mutated inside the updater can
      // still be at its unset initial value when read here, silently sending a stale
      // (effectively empty) value to the backend on every toggle.
      const node = findNode(state_ref.current.groups, node_id);
      const current = (node?.values[column_id] as string[]) || [];
      const next_value = current.includes(option) ? current.filter((v) => v !== option) : current.concat([option]);
      const previous_value: CellValue = current.length ? current : null;
      const applied_next_value: CellValue = next_value.length ? next_value : null;
      pushHistory({ undo: () => applyCellValue(node_id, column_id, previous_value), redo: () => applyCellValue(node_id, column_id, applied_next_value) });
      applyCellValue(node_id, column_id, applied_next_value);
    },
    [applyCellValue, pushHistory]
  );

  const clearCellValue = useCallback(
    (node_id: string, column_id: string) => {
      const previous_value = findNode(state_ref.current.groups, node_id)?.values[column_id] ?? null;
      setState((s) => ({ ...s, open_cell_menu_key: null }));
      pushHistory({ undo: () => applyCellValue(node_id, column_id, previous_value), redo: () => applyCellValue(node_id, column_id, null) });
      applyCellValue(node_id, column_id, null);
    },
    [applyCellValue, pushHistory]
  );

  /** Like `setCellValue`, but skips `onCellValueChange` — for a value that was already persisted by the caller of `uploadCellFiles`/`deleteCellFile` below, so it isn't sent to the server a second time as an ordinary cell edit. */
  const setCellValueLocal = useCallback((node_id: string, column_id: string, value: CellValue) => {
    setState((s) => ({
      ...s,
      groups: updateNodeById<BoardTableNode>(s.groups, node_id, (n) => ({ ...n, values: { ...n.values, [column_id]: value } })),
    }));
  }, []);

  /** Files cell's "Upload" button. */
  const uploadCellFiles = useCallback(
    async (node_id: string, column_id: string, files: File[]) => {
      const updated = await config_ref.current.onUploadCellFiles?.(node_id, column_id, files);
      if (updated) setCellValueLocal(node_id, column_id, updated);
    },
    [setCellValueLocal]
  );

  /** Files cell's per-chip delete "×". */
  const deleteCellFile = useCallback(
    async (node_id: string, column_id: string, file_id: string) => {
      const updated = await config_ref.current.onDeleteCellFile?.(node_id, column_id, file_id);
      if (updated) setCellValueLocal(node_id, column_id, updated);
    },
    [setCellValueLocal]
  );

  // ---- active cell: Excel-style keyboard navigation, copy/paste, fill-down ----

  /** A data cell was clicked (not the item/subitem name, checkbox, or comment column — see `ItemRow`/`SubitemRow`). */
  const setActiveCell = useCallback((node_id: string, column_id: string) => {
    setState((s) => ({ ...s, active_cell: { node_id, column_id } }));
  }, []);

  const clearActiveCell = useCallback(() => {
    setState((s) => (s.active_cell || s.fill_drag ? { ...s, active_cell: null, fill_drag: null } : s));
  }, []);

  /** Arrow-key navigation from the active cell — see `visibleRowSequence`'s own doc comment for the row order this walks. */
  const moveActiveCell = useCallback((direction: "up" | "down" | "left" | "right") => {
    setState((s) => {
      if (!s.active_cell) return s;
      const rows = visibleRowSequence(s.groups, s.collapsed_groups, s.open_map);
      const row_index = rows.findIndex((r) => r.node_id === s.active_cell!.node_id);
      if (row_index < 0) return s;
      const row = rows[row_index];

      if (direction === "left" || direction === "right") {
        const col_index = row.columns.findIndex((c) => c.id === s.active_cell!.column_id);
        if (col_index < 0) return s;
        const next_index = direction === "left" ? col_index - 1 : col_index + 1;
        if (next_index < 0 || next_index >= row.columns.length) return s;
        return { ...s, active_cell: { node_id: row.node_id, column_id: row.columns[next_index].id } };
      }

      const next_row_index = direction === "up" ? row_index - 1 : row_index + 1;
      if (next_row_index < 0 || next_row_index >= rows.length) return s;
      const next_row = rows[next_row_index];
      // Item and subitem rows have independent column sets, so up/down keeps
      // the same column id only when the row actually has one — falling back
      // to that row's first column rather than clamping to a no-op, so
      // vertical navigation across the item/subitem boundary still lands
      // somewhere useful instead of silently doing nothing.
      const next_column_id = next_row.columns.some((c) => c.id === s.active_cell!.column_id)
        ? s.active_cell!.column_id
        : next_row.columns[0]?.id;
      if (!next_column_id) return s;
      return { ...s, active_cell: { node_id: next_row.node_id, column_id: next_column_id } };
    });
  }, []);

  /** Ctrl/Cmd+C on the active cell — also best-effort mirrors the value onto the OS clipboard as plain text, for pasting into Excel/Sheets. */
  const copyActiveCell = useCallback(() => {
    const active_cell = state_ref.current.active_cell;
    if (!active_cell) return;
    const node = findNode(state_ref.current.groups, active_cell.node_id);
    if (!node) return;
    const value = node.values[active_cell.column_id] ?? null;
    setState((s) => ({ ...s, clipboard_cell: { value } }));
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const text = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, []);

  /** Ctrl/Cmd+V on the active cell — pastes the last cell copied via `copyActiveCell` (an external paste from outside the board has no structured value to reuse, so it's a no-op rather than guessing at a conversion). */
  const pasteIntoActiveCell = useCallback(() => {
    const s = state_ref.current;
    if (!s.active_cell || !s.clipboard_cell) return;
    setCellValue(s.active_cell.node_id, s.active_cell.column_id, s.clipboard_cell.value);
  }, [setCellValue]);

  /** Mouse-down on the active cell's fill handle — the little square at its bottom-right corner. */
  const startFillDrag = useCallback((node_id: string, column_id: string) => {
    setState((s) => ({ ...s, fill_drag: { column_id, anchor_node_id: node_id, hovered_node_id: node_id } }));
  }, []);

  /** The pointer, while dragging, entered a different row's cell in the same column. */
  const updateFillDragHover = useCallback((node_id: string) => {
    setState((s) => (s.fill_drag ? { ...s, fill_drag: { ...s.fill_drag, hovered_node_id: node_id } } : s));
  }, []);

  /** Mouse-up while dragging — copies the anchor cell's value onto every row the drag passed over. */
  const commitFillDrag = useCallback(() => {
    const s = state_ref.current;
    const fill_drag = s.fill_drag;
    if (!fill_drag) return;
    setState((current) => ({ ...current, fill_drag: null }));
    if (fill_drag.hovered_node_id === fill_drag.anchor_node_id) return;

    const rows = visibleRowSequence(s.groups, s.collapsed_groups, s.open_map);
    const anchor_index = rows.findIndex((r) => r.node_id === fill_drag.anchor_node_id);
    const hovered_index = rows.findIndex((r) => r.node_id === fill_drag.hovered_node_id);
    if (anchor_index < 0 || hovered_index < 0) return;

    const anchor_node = findNode(s.groups, fill_drag.anchor_node_id);
    if (!anchor_node) return;
    const value = anchor_node.values[fill_drag.column_id] ?? null;

    const [start, end] = anchor_index < hovered_index ? [anchor_index, hovered_index] : [hovered_index, anchor_index];
    for (let i = start; i <= end; i++) {
      const row = rows[i];
      if (row.node_id === fill_drag.anchor_node_id) continue;
      // Only fills rows that actually have this column (an item column
      // dragged across the item/subitem boundary skips subitem rows, which
      // have their own independent column set — see `visibleRowSequence`).
      if (row.columns.some((c) => c.id === fill_drag.column_id)) {
        setCellValue(row.node_id, fill_drag.column_id, value);
      }
    }
  }, [setCellValue]);

  const cancelFillDrag = useCallback(() => {
    setState((s) => (s.fill_drag ? { ...s, fill_drag: null } : s));
  }, []);

  // Ctrl/Cmd+C / Ctrl/Cmd+V / arrow keys act on the active cell from
  // anywhere on the page — skipped while the pointer's actual target is a
  // text input/textarea/contenteditable (the item-name editor, a column
  // rename field, a picker's search box, ...) so this never hijacks normal
  // typing, and skipped while any menu/popover/rename is open so its own
  // keyboard handling (if any) isn't shadowed.
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    };
    const hasOverlayOpen = (s: BoardTableState): boolean =>
      !!(
        s.editing_id ||
        s.editing_column ||
        s.open_row_menu_id ||
        s.open_group_menu_key ||
        s.open_column_menu_key ||
        s.open_cell_menu_key ||
        s.open_owner_menu_key ||
        s.open_picker_key ||
        s.label_editor_kind ||
        s.tag_editor_open
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      const s = state_ref.current;
      if (hasOverlayOpen(s) || isTypingTarget(event.target)) return;

      // Undo/redo act page-wide (no active cell needed), mirroring every
      // other editor's Ctrl/Cmd+Z — unlike copy/paste/arrow-nav below, which
      // are meaningless without one already focused.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (!s.active_cell) return;

      if (event.key === "Escape") {
        if (s.fill_drag) cancelFillDrag();
        else clearActiveCell();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyActiveCell();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteIntoActiveCell();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        moveActiveCell(
          event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : event.key === "ArrowLeft" ? "left" : "right"
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearActiveCell, copyActiveCell, pasteIntoActiveCell, moveActiveCell, cancelFillDrag, undo, redo]);

  // Commits (or cancels) an in-progress fill-handle drag as soon as the
  // mouse button is released anywhere on the page — the drag doesn't rely on
  // the native HTML5 drag-and-drop API, so nothing else guarantees `mouseup`
  // fires on a particular element.
  useEffect(() => {
    const handleMouseUp = () => {
      if (state_ref.current.fill_drag) commitFillDrag();
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [commitFillDrag]);

  // ---- row menu / structural item ops -------------------------------------

  const openRowMenu = useCallback((id: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_row_menu_id: s.open_row_menu_id === id ? null : id }));
  }, []);

  const closeRowMenu = useCallback(() => setState((s) => ({ ...s, open_row_menu_id: null })), []);

  /**
   * `preset_id` lets a real-data caller await the row's real backend id
   * *before* it ever appears locally (see `UseBoardTableConfig`'s own doc
   * comment), so it's addressable by real handlers (rename, cell edits) from
   * the moment it's inserted — no separate local-id-to-real-id reconciliation
   * step. Omitted, a local id is generated exactly like the standalone demo.
   */
  const addItem = useCallback(
    (group_key: string, preset_id?: string) => {
      const id = preset_id ?? nextId("item");
      setState((s) => ({
        ...s,
        groups: insertItemIntoGroup(s.groups, group_key, { id, name: "New item", values: { owner: [], status: "" }, subs: [] }),
        editing_id: id,
        edit_draft: "New item",
        collapsed_groups: { ...s.collapsed_groups, [group_key]: false },
      }));
      return id;
    },
    [nextId]
  );

  const addSubitem = useCallback(
    (item_id: string, preset_id?: string) => {
      const id = preset_id ?? nextId(item_id);
      setState((s) => ({
        ...s,
        groups: insertSubIntoItem(s.groups, item_id, { id, name: "New subitem", values: { owner: [], status: "" } }),
        open_map: { ...s.open_map, [item_id]: true },
        editing_id: id,
        edit_draft: "New subitem",
      }));
      return id;
    },
    [nextId]
  );

  const deleteNode = useCallback((id: string) => {
    setState((s) => ({ ...s, groups: removeNodeById(s.groups, id).groups, open_row_menu_id: null, selected_map: { ...s.selected_map, [id]: false } }));
    config_ref.current.onDeleteNode?.(id);
  }, []);

  /** `preset_id` is the real backend id of the row a real board already created below `id`, see `addItem`'s own doc comment. */
  const createBelow = useCallback(
    (id: string, preset_id?: string) => {
      setState((s) => {
        const location = locateNode(s.groups, id);
        if (!location) return s;
        const new_id = preset_id ?? nextId("new");
        if (location.kind === "item") {
          return {
            ...s,
            groups: insertItemIntoGroup(s.groups, location.group_key, { id: new_id, name: "New item", values: { owner: [], status: "" }, subs: [] }, location.item_index + 1),
            editing_id: new_id,
            edit_draft: "New item",
            open_row_menu_id: null,
          };
        }
        return {
          ...s,
          groups: insertSubIntoItem(s.groups, location.item_id, { id: new_id, name: "New subitem", values: { owner: [], status: "" } }, location.sub_index + 1),
          editing_id: new_id,
          edit_draft: "New subitem",
          open_row_menu_id: null,
        };
      });
    },
    [nextId]
  );

  const duplicateNode = useCallback(
    (id: string, with_subs: boolean) => {
      setState((s) => {
        const location = locateNode(s.groups, id);
        if (!location) return s;
        if (location.kind === "item") {
          const group = findGroup(s.groups, location.group_key);
          const original = group?.items[location.item_index];
          if (!original) return s;
          const copy: BoardTableItem = {
            ...original,
            id: nextId("copy"),
            name: `${original.name} (copy)`,
            values: { ...original.values },
            subs: with_subs ? original.subs.map((sub) => ({ ...sub, id: nextId("copy"), values: { ...sub.values } })) : [],
          };
          return { ...s, groups: insertItemIntoGroup(s.groups, location.group_key, copy, location.item_index + 1), open_row_menu_id: null };
        }
        const item = findItem(s.groups, location.item_id);
        const original = item?.subs[location.sub_index];
        if (!original) return s;
        const copy: BoardTableNode = { ...original, id: nextId("copy"), name: `${original.name} (copy)`, values: { ...original.values } };
        return { ...s, groups: insertSubIntoItem(s.groups, location.item_id, copy, location.sub_index + 1), open_row_menu_id: null };
      });
    },
    [nextId]
  );

  const moveItemToGroup = useCallback((item_id: string, target_group_key: string) => {
    setState((s) => {
      const { groups: without, removed_item } = removeNodeById(s.groups, item_id);
      if (!removed_item) return s;
      return { ...s, groups: insertItemIntoGroup(without, target_group_key, removed_item), open_row_menu_id: null };
    });
  }, []);

  /** A subitem's "Move to item": re-parents it under another item. Local-only, a real board persists it through `BoardTable`'s `onChangeNodeParent`. */
  const moveSubToItem = useCallback((sub_id: string, target_item_id: string) => {
    setState((s) => {
      const { groups: without, removed_sub } = removeNodeById(s.groups, sub_id);
      if (!removed_sub) return s;
      return { ...s, groups: insertSubIntoItem(without, target_item_id, removed_sub), open_row_menu_id: null };
    });
  }, []);

  /** Row menu's "Archive". Local-only, a real board persists it through `BoardTable`'s `onArchiveNode`. */
  const archiveNode = useCallback((id: string) => {
    setState((s) => ({ ...s, groups: removeNodeById(s.groups, id).groups, open_row_menu_id: null, selected_map: { ...s.selected_map, [id]: false } }));
  }, []);

  const convertSubToItem = useCallback((sub_id: string) => {
    setState((s) => {
      const location = locateNode(s.groups, sub_id);
      if (!location || location.kind !== "sub") return s;
      const { groups: without, removed_sub } = removeNodeById(s.groups, sub_id);
      if (!removed_sub) return s;
      const promoted: BoardTableItem = { ...removed_sub, subs: [] };
      return { ...s, groups: insertItemIntoGroup(without, location.group_key, promoted), open_row_menu_id: null };
    });
  }, []);

  const convertItemToSub = useCallback((item_id: string, target_item_id: string) => {
    setState((s) => {
      const { groups: without, removed_item } = removeNodeById(s.groups, item_id);
      if (!removed_item) return s;
      const demoted: BoardTableNode = { id: removed_item.id, name: removed_item.name, values: removed_item.values };
      return { ...s, groups: insertSubIntoItem(without, target_item_id, demoted), open_row_menu_id: null };
    });
  }, []);

  // ---- hover / drag --------------------------------------------------------

  const setHoverRow = useCallback((id: string | null) => setState((s) => ({ ...s, hover_row_id: id })), []);
  const setHoverGroup = useCallback((key: string | null) => setState((s) => ({ ...s, hover_group_key: key })), []);
  const setHoverHead = useCallback((key: string | null) => setState((s) => ({ ...s, hover_head_key: key })), []);

  const onDragStart = useCallback((node_id: string, parent_id: string) => {
    setState((s) => {
      const origin_order =
        parent_id === "ROOT"
          ? (s.groups.find((g) => g.items.some((it) => it.id === node_id))?.items.map((it) => it.id) ?? [])
          : (findItem(s.groups, parent_id)?.subs.map((sub) => sub.id) ?? []);
      return { ...s, drag: { node_id, parent_id, origin_order } };
    });
  }, []);

  const onDragOver = useCallback((over_id: string, over_parent_id: string) => {
    setState((s) => {
      const drag = s.drag;
      if (!drag || drag.parent_id !== over_parent_id || drag.node_id === over_id) return s;
      if (over_parent_id === "ROOT") {
        const group = s.groups.find((g) => g.items.some((it) => it.id === drag.node_id));
        if (!group) return s;
        return { ...s, groups: s.groups.map((g) => (g.key !== group.key ? g : { ...g, items: reorderWithinList(g.items, drag.node_id, over_id) })) };
      }
      return {
        ...s,
        groups: s.groups.map((g) => ({
          ...g,
          items: g.items.map((it) => (it.id !== over_parent_id ? it : { ...it, subs: reorderWithinList(it.subs, drag.node_id, over_id) })),
        })),
      };
    });
  }, []);

  /**
   * Compares the dragged list's final order against the snapshot `onDragStart`
   * captured and, when a drop actually moved something, reports it through
   * `onReorderItems` — computed from `state_ref` (mirrors `commitEditName`'s
   * read-before-`setState` pattern) since the comparison needs the drag's
   * list *before* `setState` below clears it.
   */
  const onDragEnd = useCallback(() => {
    const drag = state_ref.current.drag;
    if (drag) {
      const is_root = drag.parent_id === "ROOT";
      const owning_group = is_root ? state_ref.current.groups.find((g) => g.items.some((it) => it.id === drag.node_id)) : undefined;
      const final_order = is_root
        ? (owning_group?.items.map((it) => it.id) ?? [])
        : (findItem(state_ref.current.groups, drag.parent_id)?.subs.map((sub) => sub.id) ?? []);
      const changed =
        final_order.length > 0 &&
        (final_order.length !== drag.origin_order.length || final_order.some((id, index) => id !== drag.origin_order[index]));

      if (changed) {
        const payload: ReorderPayload = is_root
          ? { scope: "root", moved_id: drag.node_id, group_key: owning_group!.key, ordered_ids: final_order }
          : { scope: "subitem", moved_id: drag.node_id, parent_id: drag.parent_id, ordered_ids: final_order };
        config_ref.current.onReorderItems?.(payload);
      }
    }
    setState((s) => ({ ...s, drag: null }));
  }, []);

  // ---- group menu / structural group ops -----------------------------------

  const openGroupMenu = useCallback((key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_group_menu_key: s.open_group_menu_key === key ? null : key }));
  }, []);
  const closeGroupMenu = useCallback(() => setState((s) => ({ ...s, open_group_menu_key: null })), []);

  const addGroup = useCallback(
    (after_group_key?: string, preset_key?: string, preset_title?: string) => {
      const key = preset_key ?? `g${nextId("grp")}`;
      setState((s) => {
        const color = GROUP_PALETTE[s.groups.length % GROUP_PALETTE.length];
        const template = s.groups[0];
        const new_group: BoardTableGroup = {
          key,
          title: preset_title ?? "New group",
          color,
          tint: color,
          is_priority: false,
          item_title: "Item",
          sub_title: "Subitem",
          base_columns: template ? template.base_columns.map((c) => ({ ...c })) : [],
          sub_base_columns: template ? template.sub_base_columns.map((c) => ({ ...c })) : [],
          custom_columns: [],
          sub_custom_columns: [],
          items: [],
        };
        // Menu-triggered "Add group" passes `after_group_key` (the group the
        // menu was opened on) so the new table lands directly below it,
        // rather than always at the end — the toolbar's own "Add new group"
        // button omits it, which still appends as before.
        const after_index = after_group_key ? s.groups.findIndex((g) => g.key === after_group_key) : -1;
        const insert_index = after_index === -1 ? s.groups.length : after_index + 1;
        const groups = [...s.groups.slice(0, insert_index), new_group, ...s.groups.slice(insert_index)];
        return { ...s, groups, open_group_menu_key: null };
      });
      return key;
    },
    [nextId]
  );

  const duplicateGroup = useCallback(
    (key: string, with_items: boolean) => {
      setState((s) => {
        const index = s.groups.findIndex((g) => g.key === key);
        if (index < 0) return s;
        const original = s.groups[index];
        const new_key = `g${nextId("grp")}`;
        const copy: BoardTableGroup = {
          ...original,
          key: new_key,
          title: `${original.title} (copy)`,
          base_columns: original.base_columns.map((c) => ({ ...c })),
          sub_base_columns: original.sub_base_columns.map((c) => ({ ...c })),
          custom_columns: original.custom_columns.map((c) => ({ ...c })),
          sub_custom_columns: original.sub_custom_columns.map((c) => ({ ...c })),
          items: with_items
            ? original.items.map((it) => ({ ...it, id: nextId("copy"), values: { ...it.values }, subs: it.subs.map((sub) => ({ ...sub, id: nextId("copy"), values: { ...sub.values } })) }))
            : [],
        };
        const next_groups = s.groups.slice();
        next_groups.splice(index + 1, 0, copy);
        return { ...s, groups: next_groups, open_group_menu_key: null };
      });
    },
    [nextId]
  );

  /**
   * Moves a group within its own priority tier: priority client groups always render
   * above the rest (see `deriveBoardRows`), so a move across that line would snap back
   * on the next sync. The move is applied locally and the resulting order is reported
   * through `onMoveGroup`. A move that would not change anything is skipped.
   */
  const moveGroupByKey = useCallback((key: string, dir: "top" | "up" | "down" | "bottom") => {
    const groups = state_ref.current.groups;
    const group = findGroup(groups, key);
    if (!group) return;

    const is_priority = !!group.is_priority;
    const tier = groups.filter((g) => !!g.is_priority === is_priority);
    const index = tier.findIndex((g) => g.key === key);
    let target = index;
    if (dir === "top") target = 0;
    else if (dir === "up") target = Math.max(0, index - 1);
    else if (dir === "down") target = Math.min(tier.length - 1, index + 1);
    else target = tier.length - 1;

    if (target === index) {
      setState((s) => ({ ...s, open_group_menu_key: null }));
      return;
    }

    const next_tier = tier.slice();
    const [moved] = next_tier.splice(index, 1);
    next_tier.splice(target, 0, moved);
    let cursor = 0;
    const next_groups = groups.map((g) => (!!g.is_priority === is_priority ? next_tier[cursor++] : g));

    setState((s) => ({ ...s, groups: next_groups, open_group_menu_key: null }));
    config_ref.current.onMoveGroup?.(key, next_groups.map((g) => g.key));
  }, []);

  const setGroupColor = useCallback((key: string, color: string) => {
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.key === key ? { ...g, color, tint: color } : g)), open_group_menu_key: null }));
    config_ref.current.onChangeGroupColor?.(key, color);
  }, []);

  const togglePriority = useCallback((key: string) => {
    const next_is_priority = !findGroup(state_ref.current.groups, key)?.is_priority;
    setState((s) => ({ ...s, groups: s.groups.map((g) => (g.key === key ? { ...g, is_priority: next_is_priority } : g)), open_group_menu_key: null }));
    config_ref.current.onToggleGroupPriority?.(key, next_is_priority);
  }, []);

  const removeGroup = useCallback((key: string) => {
    if (config_ref.current.onRequestRemoveGroup) {
      setState((s) => ({ ...s, open_group_menu_key: null }));
      config_ref.current.onRequestRemoveGroup(key);
      return;
    }
    setState((s) => ({ ...s, groups: s.groups.filter((g) => g.key !== key), open_group_menu_key: null }));
    config_ref.current.onRemoveGroup?.(key);
  }, []);

  const archiveGroup = useCallback((key: string) => {
    setState((s) => ({ ...s, groups: s.groups.filter((g) => g.key !== key), open_group_menu_key: null }));
    config_ref.current.onArchiveGroup?.(key);
  }, []);

  const selectAllInGroup = useCallback((key: string) => {
    setState((s) => {
      const group = findGroup(s.groups, key);
      if (!group) return s;
      const next_selected = { ...s.selected_map };
      group.items.forEach((it) => {
        next_selected[it.id] = true;
        it.subs.forEach((sub) => (next_selected[sub.id] = true));
      });
      return { ...s, selected_map: next_selected, open_group_menu_key: null };
    });
  }, []);

  const expandAllGroups = useCallback(() => {
    setState((s) => ({ ...s, collapsed_groups: {}, open_group_menu_key: null }));
    config_ref.current.onCollapsedGroupsChange?.([]);
  }, []);

  const setAllSubsOpen = useCallback((key: string, value: boolean) => {
    setState((s) => {
      const group = findGroup(s.groups, key);
      if (!group) return s;
      const next_open = { ...s.open_map };
      group.items.forEach((it) => {
        if (it.subs.length) next_open[it.id] = value;
      });
      return { ...s, open_map: next_open, open_group_menu_key: null };
    });
  }, []);

  // ---- columns --------------------------------------------------------------

  const openColumnMenu = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_column_menu_key: s.open_column_menu_key === scoped_key ? null : scoped_key }));
  }, []);
  const closeColumnMenu = useCallback(() => setState((s) => ({ ...s, open_column_menu_key: null })), []);

  const columnListKey = (scope: ColumnScope) => (scope === "main" ? "custom_columns" : "sub_custom_columns");

  /** Patches one column's `width` wherever it lives in `group_key`'s base/custom column list — the shared write both `updateColumnSettings` and the live resize-drag preview apply to local state. */
  /** Patches one column wherever it lives in `group_key`'s base/custom column list — the shared write `applyColumnWidth`, `updateColumnSettings`'s non-width fields, and the live resize-drag preview all apply to local state. */
  const applyColumnPatch = (groups: BoardTableGroup[], group_key: string, scope: ColumnScope, column_id: string, patch: Partial<ColumnDef>): BoardTableGroup[] => {
    const list_key = columnListKey(scope);
    const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
    const apply = (c: ColumnDef) => (c.id === column_id ? { ...c, ...patch } : c);
    return groups.map((g) =>
      g.key !== group_key
        ? g
        : {
            ...g,
            [base_key]: (g[base_key as keyof BoardTableGroup] as ColumnDef[]).map(apply),
            [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).map(apply),
          }
    );
  };
  const applyColumnWidth = (groups: BoardTableGroup[], group_key: string, scope: ColumnScope, column_id: string, width: number): BoardTableGroup[] =>
    applyColumnPatch(groups, group_key, scope, column_id, { width });

  const openPicker = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_picker_key: s.open_picker_key === scoped_key ? null : scoped_key, picker_query: "" }));
  }, []);
  const closePicker = useCallback(() => setState((s) => ({ ...s, open_picker_key: null })), []);
  const setPickerQuery = useCallback((value: string) => setState((s) => ({ ...s, picker_query: value })), []);

  const addColumn = useCallback(
    (group_key: string, scope: ColumnScope, kind: ColumnKind, label: string, default_width: number, after_column_id?: string) => {
      setState((s) => {
        const list_key = columnListKey(scope);
        const id = nextId("col");
        // A dropdown column's options are always its own — never the shared,
        // board-wide `label_defs` palette another dropdown column might be
        // using — so it starts with a real (empty) array of its own rather
        // than `undefined`, which would read as "no options set yet, fall
        // back to something shared" everywhere `column.options` is consulted.
        const column: ColumnDef = { id, title: label, kind, width: default_width, options: kind === "dropdown" ? [] : undefined };
        return {
          ...s,
          groups: s.groups.map((g) => {
            if (g.key !== group_key) return g;
            const current = g[list_key as keyof BoardTableGroup] as ColumnDef[];
            const insert_at = after_column_id ? current.findIndex((c) => c.id === after_column_id) : -1;
            const next = insert_at < 0 ? current.concat(column) : [...current.slice(0, insert_at + 1), column, ...current.slice(insert_at + 1)];
            return { ...g, [list_key]: next };
          }),
          open_picker_key: null,
        };
      });
    },
    [nextId]
  );

  const renameColumn = useCallback((group_key: string, scope: ColumnScope, column_id: string, title: string) => {
    setState((s) => {
      const list_key = columnListKey(scope);
      return {
        ...s,
        groups: s.groups.map((g) => {
          if (g.key !== group_key) return g;
          const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
          const in_base = (g[base_key as keyof BoardTableGroup] as ColumnDef[]).some((c) => c.id === column_id);
          if (in_base) {
            return { ...g, [base_key]: (g[base_key as keyof BoardTableGroup] as ColumnDef[]).map((c) => (c.id === column_id ? { ...c, title } : c)) };
          }
          return { ...g, [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).map((c) => (c.id === column_id ? { ...c, title } : c)) };
        }),
      };
    });
    config_ref.current.onRenameColumn?.(group_key, scope, column_id, title);
  }, []);

  const renameItemTitle = useCallback((group_key: string, scope: ColumnScope, title: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.key !== group_key ? g : { ...g, [scope === "main" ? "item_title" : "sub_title"]: title })),
    }));
  }, []);

  /**
   * Click-to-rename on a header cell's title (see `ColumnHeaderCell`) —
   * `column_id` is null for the item-title/sub-title virtual columns, which
   * commit through `renameItemTitle` instead of `renameColumn`. Mirrors
   * `startGroupRename`'s own pattern: centralized editing state (rather than
   * local component state) so only one thing is ever mid-rename, and the
   * owning column menu is closed if it happened to be open.
   */
  const startColumnRename = useCallback((scoped_key: string, group_key: string, scope: ColumnScope, column_id: string | null, title: string) => {
    setState((s) => ({ ...s, editing_column: { scoped_key, group_key, scope, column_id }, column_draft: title, open_column_menu_key: null }));
  }, []);

  const updateColumnDraft = useCallback((value: string) => {
    setState((s) => ({ ...s, column_draft: value }));
  }, []);

  const commitColumnRename = useCallback(() => {
    const editing_column = state_ref.current.editing_column;
    if (!editing_column) return;
    const title = (state_ref.current.column_draft || "").trim() || "Untitled column";
    setState((s) => ({ ...s, editing_column: null }));
    const { group_key, scope, column_id } = editing_column;
    if (column_id) {
      renameColumn(group_key, scope, column_id, title);
    } else {
      renameItemTitle(group_key, scope, title);
    }
  }, [renameColumn, renameItemTitle]);

  const cancelColumnRename = useCallback(() => {
    setState((s) => ({ ...s, editing_column: null }));
  }, []);

  const deleteColumn = useCallback((group_key: string, scope: ColumnScope, column_id: string) => {
    setState((s) => {
      const list_key = columnListKey(scope);
      return {
        ...s,
        groups: s.groups.map((g) => (g.key !== group_key ? g : { ...g, [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).filter((c) => c.id !== column_id) })),
        open_column_menu_key: null,
      };
    });
    config_ref.current.onDeleteColumn?.(group_key, scope, column_id);
  }, []);

  const duplicateColumn = useCallback(
    (group_key: string, scope: ColumnScope, column_id: string) => {
      setState((s) => {
        const list_key = columnListKey(scope);
        const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
        return {
          ...s,
          groups: s.groups.map((g) => {
            if (g.key !== group_key) return g;
            const base = g[base_key as keyof BoardTableGroup] as ColumnDef[];
            const custom = g[list_key as keyof BoardTableGroup] as ColumnDef[];
            const original = base.find((c) => c.id === column_id) ?? custom.find((c) => c.id === column_id);
            if (!original) return g;
            const copy: ColumnDef = { ...original, id: nextId("col"), title: `${original.title} (copy)` };
            return { ...g, [list_key]: custom.concat(copy) };
          }),
          open_column_menu_key: null,
        };
      });
    },
    [nextId]
  );

  /**
   * Local-only demo fallback for the column menu's "Duplicate to another
   * board" (mirrors `duplicateColumn`'s own role) — the mock demo has no
   * other board to actually copy into, so this just closes the menu; a real
   * board instead hands this off through `BoardTable`'s own `onDuplicateColumnToBoard`
   * prop, the same handshake `onDuplicateColumn` already uses.
   */
  const duplicateColumnToBoard = useCallback((_group_key: string, _scope: ColumnScope, _column_id: string, _target_board_id: string) => {
    setState((s) => ({ ...s, open_column_menu_key: null }));
  }, []);

  const changeColumnKind = useCallback((group_key: string, scope: ColumnScope, column_id: string, kind: ColumnKind, default_width: number) => {
    setState((s) => {
      const list_key = columnListKey(scope);
      const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
      const patch = (c: ColumnDef) => (c.id === column_id ? { ...c, kind, width: default_width, options: undefined } : c);
      return {
        ...s,
        groups: s.groups.map((g) =>
          g.key !== group_key
            ? g
            : {
                ...g,
                [base_key]: (g[base_key as keyof BoardTableGroup] as ColumnDef[]).map(patch),
                [list_key]: (g[list_key as keyof BoardTableGroup] as ColumnDef[]).map(patch),
              }
        ),
        open_column_menu_key: null,
      };
    });
    config_ref.current.onChangeColumnKind?.(group_key, scope, column_id, kind, default_width);
  }, []);

  const updateColumnSettings = useCallback(
    (
      group_key: string,
      scope: ColumnScope,
      column_id: string,
      patch: { width?: number; hideable?: boolean; pinnable?: boolean; formula?: FormulaConfig; mirror?: MirrorConfig; linked_board_id?: string; validation?: ColumnValidation; aggregation?: ColumnDef["aggregation"]; reminder?: ColumnDef["reminder"] }
    ) => {
      const local_patch: Partial<ColumnDef> = {};
      if (patch.width != null) local_patch.width = patch.width;
      if (patch.formula) local_patch.formula = patch.formula;
      if (patch.mirror) local_patch.mirror = patch.mirror;
      if (patch.linked_board_id) local_patch.linked_board_id = patch.linked_board_id;
      if (patch.validation) local_patch.validation = patch.validation;
      if (patch.aggregation) local_patch.aggregation = patch.aggregation;
      if (patch.reminder) local_patch.reminder = patch.reminder;
      setState((s) => (Object.keys(local_patch).length === 0 ? s : { ...s, groups: applyColumnPatch(s.groups, group_key, scope, column_id, local_patch) }));
      config_ref.current.onUpdateColumnSettings?.(group_key, scope, column_id, patch);
    },
    []
  );

  /**
   * Local-only width update fired on every pointer move of a column-header
   * resize drag, so the grid tracks the cursor smoothly without a network
   * request per pixel. The drag's final width is committed — local state
   * again plus the real `onUpdateColumnSettings` persistence call — through
   * `updateColumnSettings` on pointer-up.
   */
  const resizeColumnPreview = useCallback((group_key: string, scope: ColumnScope, column_id: string, width: number) => {
    setState((s) => ({ ...s, groups: applyColumnWidth(s.groups, group_key, scope, column_id, width) }));
  }, []);

  /** Local-only width preview for the item-title virtual column, fired on every pointer move — mirrors `resizeColumnPreview`, but board-wide rather than per-group since `name_col_width` is shared across every `GroupSection` (see `BoardTable`). */
  const resizeItemColumnPreview = useCallback((width: number) => {
    setState((s) => ({ ...s, item_column_width: width }));
  }, []);

  /** Commits the item-title column's resize-drag on pointer-up — local state plus real persistence through `onResizeItemColumn`, mirroring `updateColumnSettings`. */
  const commitItemColumnResize = useCallback((width: number) => {
    setState((s) => ({ ...s, item_column_width: width }));
    config_ref.current.onResizeItemColumn?.(width);
  }, []);

  /** Local-only width preview for the subitem-title virtual column — see `resizeItemColumnPreview`, applied board-wide the same way. */
  const resizeSubColumnPreview = useCallback((width: number) => {
    setState((s) => ({ ...s, sub_column_width: width }));
  }, []);

  /** Commits the subitem-title column's resize-drag on pointer-up — see `commitItemColumnResize`. */
  const commitSubColumnResize = useCallback((width: number) => {
    setState((s) => ({ ...s, sub_column_width: width }));
    config_ref.current.onResizeSubColumn?.(width);
  }, []);

  // ---- column-header drag-and-drop reordering --------------------------------

  /** A group's merged base+custom column list for `scope`, in display order — the same concatenation every column-header row already renders (see `GroupColumnHeaderRow`/`SubitemHeaderRow`). */
  const mergedColumnsOf = (group: BoardTableGroup, scope: ColumnScope): ColumnDef[] => {
    const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
    const list_key = columnListKey(scope);
    return (group[base_key as keyof BoardTableGroup] as ColumnDef[]).concat(group[list_key as keyof BoardTableGroup] as ColumnDef[]);
  };

  const onColumnDragStart = useCallback((group_key: string, scope: ColumnScope, column_id: string) => {
    setState((s) => {
      const group = findGroup(s.groups, group_key);
      if (!group) return s;
      return { ...s, column_drag: { column_id, group_key, scope, origin_order: mergedColumnsOf(group, scope).map((c) => c.id) } };
    });
  }, []);

  /**
   * Column order is shared across every group rendering the same scope
   * (every group's header shows the same column set), so the reorder is
   * applied to every group's own base/custom lists in lockstep — not just
   * the group the drag started in — mirroring how `table_base_columns` is
   * one shared array in `TableBoardView`. A group missing either column
   * (the mock demo's per-group `custom_columns` can differ) is left alone.
   */
  const onColumnDragOver = useCallback((over_column_id: string) => {
    setState((s) => {
      const drag = s.column_drag;
      if (!drag || drag.column_id === over_column_id) return s;
      const { scope } = drag;
      const base_key = scope === "main" ? "base_columns" : "sub_base_columns";
      const list_key = columnListKey(scope);
      return {
        ...s,
        groups: s.groups.map((g) => {
          const merged = mergedColumnsOf(g, scope);
          if (!merged.some((c) => c.id === drag.column_id) || !merged.some((c) => c.id === over_column_id)) return g;
          const reordered = reorderWithinList(merged, drag.column_id, over_column_id);
          const base_ids = new Set((g[base_key as keyof BoardTableGroup] as ColumnDef[]).map((c) => c.id));
          return { ...g, [base_key]: reordered.filter((c) => base_ids.has(c.id)), [list_key]: reordered.filter((c) => !base_ids.has(c.id)) };
        }),
      };
    });
  }, []);

  /**
   * Compares the dragged scope's final column order against the snapshot
   * `onColumnDragStart` captured and, when a drop actually moved something,
   * reports it through `onReorderColumns` — mirrors `onDragEnd`'s own
   * read-before-`setState` pattern for row drags.
   */
  const onColumnDragEnd = useCallback(() => {
    const drag = state_ref.current.column_drag;
    if (drag) {
      const group = findGroup(state_ref.current.groups, drag.group_key);
      const final_order = group ? mergedColumnsOf(group, drag.scope).map((c) => c.id) : [];
      const changed =
        final_order.length > 0 &&
        (final_order.length !== drag.origin_order.length || final_order.some((id, index) => id !== drag.origin_order[index]));

      if (changed) {
        config_ref.current.onReorderColumns?.({ scope: drag.scope, moved_id: drag.column_id, group_key: drag.group_key, ordered_ids: final_order });
      }
    }
    setState((s) => ({ ...s, column_drag: null }));
  }, []);

  const collapseAllGroups = useCallback(() => {
    const collapsed_groups = Object.fromEntries(state_ref.current.groups.map((g) => [g.key, true]));
    setState((s) => ({ ...s, collapsed_groups, open_column_menu_key: null }));
    config_ref.current.onCollapsedGroupsChange?.(collapsedGroupKeys(collapsed_groups));
  }, []);

  const setSort = useCallback((scope_key: string, column_id: string, direction: "asc" | "desc" | null) => {
    setState((s) => ({ ...s, sort: direction ? { scope_key, column_id, direction } : null, open_column_menu_key: null }));
  }, []);

  // ---- cell popovers ----------------------------------------------------

  const openCellMenu = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_cell_menu_key: s.open_cell_menu_key === scoped_key ? null : scoped_key }));
  }, []);
  const closeCellMenu = useCallback(() => setState((s) => ({ ...s, open_cell_menu_key: null, people_query: "", tag_query: "" })), []);

  const openOwnerMenu = useCallback((scoped_key: string) => {
    setState((s) => ({ ...s, ...closeAllMenus, open_owner_menu_key: s.open_owner_menu_key === scoped_key ? null : scoped_key, people_query: "" }));
  }, []);
  const closeOwnerMenu = useCallback(() => setState((s) => ({ ...s, open_owner_menu_key: null })), []);
  const setPeopleQuery = useCallback((value: string) => setState((s) => ({ ...s, people_query: value })), []);

  // ---- status / label / tag editors -----------------------------------------

  /**
   * `column_id` names the real column being edited (a status/label cell on
   * an API-backed board) so the editor can persist through
   * `addColumnOption`/`renameColumnOption`/`recolorColumnOption`/
   * `deleteColumnOption` — the same column-option persistence path the
   * Dropdown cell already uses — instead of the shared, unpersisted
   * `status_defs`/`label_defs` mock-demo fallback. Omitted (or naming a
   * column with no `options` of its own), `BoardTable` falls back to that
   * shared palette.
   */
  const openLabelEditor = useCallback(
    (kind: "status" | "label", column_id: string | null = null) =>
      setState((s) => ({ ...s, label_editor_kind: kind, label_editor_column_id: column_id, ...closeAllMenus })),
    []
  );
  const closeLabelEditor = useCallback(() => setState((s) => ({ ...s, label_editor_kind: null, label_editor_column_id: null })), []);

  /** Opens the Formula/Mirror/Connect-board settings modal for a column, see `BoardTableState.config_editor`'s own doc comment. */
  const openConfigEditor = useCallback(
    (kind: "formula" | "mirror" | "connect_board", column_id: string) =>
      setState((s) => ({ ...s, config_editor: { kind, column_id }, ...closeAllMenus })),
    []
  );
  const closeConfigEditor = useCallback(() => setState((s) => ({ ...s, config_editor: null })), []);

  const addStatusDef = useCallback(() => {
    setState((s) => {
      const color = STATUS_PALETTE[s.status_defs.length % STATUS_PALETTE.length];
      return { ...s, status_defs: s.status_defs.concat({ id: nextId("sd"), label: "New status", color }) };
    });
  }, [nextId]);

  const renameStatusDef = useCallback((id: string, label: string) => {
    setState((s) => ({ ...s, status_defs: s.status_defs.map((d) => (d.id === id ? { ...d, label } : d)) }));
  }, []);

  const setStatusDefColor = useCallback((id: string, color: string) => {
    setState((s) => ({ ...s, status_defs: s.status_defs.map((d) => (d.id === id ? { ...d, color } : d)) }));
  }, []);

  const deleteStatusDef = useCallback((id: string) => {
    setState((s) => ({ ...s, status_defs: s.status_defs.filter((d) => d.id !== id) }));
  }, []);

  const addLabelDef = useCallback(() => {
    setState((s) => {
      const color = STATUS_PALETTE[s.label_defs.length % STATUS_PALETTE.length];
      return { ...s, label_defs: s.label_defs.concat({ id: nextId("lb"), label: "New label", color }) };
    });
  }, [nextId]);

  const renameLabelDef = useCallback((id: string, label: string) => {
    setState((s) => ({ ...s, label_defs: s.label_defs.map((d) => (d.id === id ? { ...d, label } : d)) }));
  }, []);

  const setLabelDefColor = useCallback((id: string, color: string) => {
    setState((s) => ({ ...s, label_defs: s.label_defs.map((d) => (d.id === id ? { ...d, color } : d)) }));
  }, []);

  const deleteLabelDef = useCallback((id: string) => {
    setState((s) => ({ ...s, label_defs: s.label_defs.filter((d) => d.id !== id) }));
  }, []);

  /**
   * Dropdown cell's own inline "New label" + Add row. A real column persists
   * through `onAddColumnOption` and picks up the confirmed option once the
   * board's `initial_groups` re-syncs; the standalone demo instead appends
   * straight to that column's own local `options` array (every dropdown
   * column owns one — see `addColumn` — so this never touches another
   * column's list).
   */
  const addColumnOption = useCallback((column_id: string, option: { label: string; color: string }) => {
    const label = option.label.trim();
    if (!label) return;
    const on_add_option = config_ref.current.onAddColumnOption;
    if (on_add_option) {
      void on_add_option(column_id, { label, color: option.color });
      return;
    }
    const new_option: StatusDef = { id: nextId("opt"), label, color: option.color };
    setState((s) => ({
      ...s,
      groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({ ...c, options: (c.options ?? []).concat(new_option) })),
    }));
  }, [nextId]);

  /**
   * Renames one of a dropdown column's own existing options, in place —
   * `DropdownMenu`'s own inline "Edit labels" mode. Mirrors `renameColumn`'s
   * local-mutation-plus-callback pattern (unlike `addColumnOption`, this acts
   * on an *existing* id, so there's no server-generated-id handshake to wait
   * on before it's safe to show locally).
   */
  const renameColumnOption = useCallback((column_id: string, option_id: string, label: string) => {
    setState((s) => ({
      ...s,
      groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({
        ...c,
        options: (c.options ?? []).map((o) => (o.id === option_id ? { ...o, label } : o)),
      })),
    }));
    config_ref.current.onRenameColumnOption?.(column_id, option_id, label);
  }, []);

  /** Recolors one of a dropdown column's own existing options — see `renameColumnOption`. */
  const recolorColumnOption = useCallback((column_id: string, option_id: string, color: string) => {
    setState((s) => ({
      ...s,
      groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({
        ...c,
        options: (c.options ?? []).map((o) => (o.id === option_id ? { ...o, color } : o)),
      })),
    }));
    config_ref.current.onRecolorColumnOption?.(column_id, option_id, color);
  }, []);

  /** Permanently deletes one of a dropdown column's own existing options — see `renameColumnOption`. */
  const deleteColumnOption = useCallback((column_id: string, option_id: string) => {
    setState((s) => ({
      ...s,
      groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({
        ...c,
        options: (c.options ?? []).filter((o) => o.id !== option_id),
      })),
    }));
    config_ref.current.onDeleteColumnOption?.(column_id, option_id);
  }, []);

  /**
   * Flips a people column's `notify_on_assignment` preference — the People
   * cell picker's bottom toggle. Mirrors `renameColumnOption`'s local-mutation-
   * plus-callback pattern: the column is shared across every table (group), so
   * `mapColumnInAllGroups` flips it everywhere it's rendered, and a real board
   * persists it server-side; the standalone demo just flips it locally.
   */
  const toggleColumnNotifyOnAssignment = useCallback((column_id: string) => {
    setState((s) => ({
      ...s,
      groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({
        ...c,
        notify_on_assignment: !(c.notify_on_assignment ?? true),
      })),
    }));
    config_ref.current.onToggleColumnNotifyOnAssignment?.(column_id);
  }, []);

  /** Formula settings modal's "Save" — mirrors `toggleColumnNotifyOnAssignment`'s local-mutation-plus-callback shape. */
  const updateColumnFormula = useCallback((column_id: string, formula: FormulaConfig) => {
    setState((s) => ({ ...s, groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({ ...c, formula })) }));
    config_ref.current.onUpdateColumnFormula?.(column_id, formula);
  }, []);

  /** Connect-board settings modal's "Save" — see `updateColumnFormula`. */
  const updateColumnLinkedBoard = useCallback((column_id: string, linked_board_id: string) => {
    setState((s) => ({ ...s, groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({ ...c, linked_board_id })) }));
    config_ref.current.onUpdateColumnLinkedBoard?.(column_id, linked_board_id);
  }, []);

  /** Mirror settings modal's "Save" — see `updateColumnFormula`. */
  const updateColumnMirror = useCallback((column_id: string, mirror: MirrorConfig) => {
    setState((s) => ({ ...s, groups: mapColumnInAllGroups(s.groups, column_id, (c) => ({ ...c, mirror })) }));
    config_ref.current.onUpdateColumnMirror?.(column_id, mirror);
  }, []);

  const openTagEditor = useCallback(() => setState((s) => ({ ...s, tag_editor_open: true, ...closeAllMenus })), []);
  const closeTagEditor = useCallback(() => setState((s) => ({ ...s, tag_editor_open: false })), []);

  /**
   * "Manage tags" modal's "Add". A real board persists through
   * `onCreateTagDef` and picks up the confirmed tag once the caller's own
   * `tag_defs` re-syncs — mirrors `addColumnOption`'s own `onAddColumnOption`
   * branch; the standalone demo instead appends straight to the local,
   * unpersisted `tag_defs` palette.
   */
  const addTagDef = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const on_create = config_ref.current.onCreateTagDef;
      if (on_create) {
        void on_create(trimmed);
        return;
      }
      setState((s) => {
        const color = STATUS_PALETTE[s.tag_defs.length % STATUS_PALETTE.length];
        return { ...s, tag_defs: s.tag_defs.concat({ id: nextId("tg"), label: trimmed, color }) };
      });
    },
    [nextId]
  );

  /**
   * A Tags cell's own inline "+ Create new tag" (`TagsMenu`'s `onCreateTag`).
   * Like `addTagDef`, but also selects the freshly created tag on the exact
   * cell it was typed into — on a real board that has to wait for
   * `onCreateTagDef` to resolve with the tag's real id (toggling the raw
   * label text the way the standalone demo does below would desync the cell
   * from `column.options`-less real `tags` data on the next reload).
   */
  const createTagOnCell = useCallback(
    (node_id: string, column_id: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const on_create = config_ref.current.onCreateTagDef;
      if (on_create) {
        void on_create(trimmed).then((created) => {
          setState((s) => ({
            ...s,
            tag_defs: s.tag_defs.some((d) => d.id === created.id) ? s.tag_defs : s.tag_defs.concat(created),
          }));
          toggleArrayValue(node_id, column_id, created.id);
        });
        return;
      }
      const id = nextId("tg");
      setState((s) => {
        const color = STATUS_PALETTE[s.tag_defs.length % STATUS_PALETTE.length];
        return { ...s, tag_defs: s.tag_defs.concat({ id, label: trimmed, color }) };
      });
      toggleArrayValue(node_id, column_id, id);
    },
    [nextId, toggleArrayValue]
  );

  const setTagDefColor = useCallback((id: string, color: string) => {
    setState((s) => ({ ...s, tag_defs: s.tag_defs.map((d) => (d.id === id ? { ...d, color } : d)) }));
    config_ref.current.onRecolorTagDef?.(id, color);
  }, []);

  const deleteTagDef = useCallback((id: string) => {
    setState((s) => ({ ...s, tag_defs: s.tag_defs.filter((d) => d.id !== id) }));
    config_ref.current.onDeleteTagDef?.(id);
  }, []);

  const setTagQuery = useCallback((value: string) => setState((s) => ({ ...s, tag_query: value })), []);

  /**
   * Resolves a Connect-board column's linked item names — called from the
   * closed cell's own chip display and from `ConnectBoardMenu` alike (see
   * `connect_board_items`'s own doc comment), fetching at most once per
   * `linked_board_id` regardless of how many cells/columns point at it.
   */
  const requested_linked_boards_ref = useRef<Set<string>>(new Set());
  const ensureLinkedBoardItems = useCallback((linked_board_id: string) => {
    const on_fetch = config_ref.current.onFetchLinkedBoardItems;
    if (!on_fetch || requested_linked_boards_ref.current.has(linked_board_id)) return;
    requested_linked_boards_ref.current.add(linked_board_id);
    void on_fetch(linked_board_id)
      .then((items) => {
        setState((s) => ({ ...s, connect_board_items: { ...s.connect_board_items, [linked_board_id]: items } }));
      })
      .catch(() => {
        // Leaves the board id unresolved (no cache entry) so a later mount can retry.
        requested_linked_boards_ref.current.delete(linked_board_id);
      });
  }, []);

  const closeAllOverlays = useCallback(() => setState((s) => ({ ...s, ...closeAllMenus })), []);

  const openComments = useCallback((node_id: string) => {
    config_ref.current.onOpenComments?.(node_id);
  }, []);

  const openItem = useCallback((node_id: string) => {
    config_ref.current.onOpenItem?.(node_id);
  }, []);

  /** `GroupSection`'s `IntersectionObserver` trigger — see `UseBoardTableConfig.onRequestGroupItems`'s own doc comment. */
  const requestGroupItems = useCallback((group_key: string) => {
    config_ref.current.onRequestGroupItems?.(group_key);
  }, []);

  const copied_row_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copied_row_timer_ref.current) clearTimeout(copied_row_timer_ref.current);
  }, []);

  /** Puts the row's link on the clipboard and flashes the menu's "copied" note for a moment, only once the browser actually accepted the write. */
  const copyRowLink = useCallback((id: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const link = config_ref.current.getNodeLink?.(id) ?? `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setState((s) => ({ ...s, copied_row_id: id }));
        if (copied_row_timer_ref.current) clearTimeout(copied_row_timer_ref.current);
        copied_row_timer_ref.current = setTimeout(() => setState((s) => (s.copied_row_id === id ? { ...s, copied_row_id: null } : s)), 1600);
      })
      .catch(() => {});
  }, []);

  const selected_count = useMemo(() => Object.values(state.selected_map).filter(Boolean).length, [state.selected_map]);
  const total_subs = useMemo(() => state.groups.reduce((a, g) => a + g.items.reduce((b, it) => b + it.subs.length, 0), 0), [state.groups]);
  const summary_text = selected_count ? `${selected_count} selected` : `${total_subs} subitems`;

  const actions = useMemo(
    () => ({
      toggleItemOpen,
      toggleSelected,
      clearSelection,
      toggleGroupCollapsed,
      startEditName,
      updateEditDraft,
      commitEditName,
      cancelEditName,
      startGroupRename,
      updateGroupDraft,
      commitGroupRename,
      cancelGroupRename,
      setCellValue,
      toggleArrayValue,
      clearCellValue,
      uploadCellFiles,
      deleteCellFile,
      setActiveCell,
      clearActiveCell,
      moveActiveCell,
      copyActiveCell,
      pasteIntoActiveCell,
      startFillDrag,
      updateFillDragHover,
      commitFillDrag,
      cancelFillDrag,
      openRowMenu,
      closeRowMenu,
      addItem,
      addSubitem,
      deleteNode,
      createBelow,
      duplicateNode,
      toggleNodePriority,
      setItemRecurrence,
      clearItemRecurrence,
      moveItemToGroup,
      moveSubToItem,
      archiveNode,
      convertSubToItem,
      convertItemToSub,
      setHoverRow,
      setHoverGroup,
      setHoverHead,
      onDragStart,
      onDragOver,
      onDragEnd,
      openGroupMenu,
      closeGroupMenu,
      addGroup,
      duplicateGroup,
      moveGroupByKey,
      setGroupColor,
      togglePriority,
      removeGroup,
      archiveGroup,
      selectAllInGroup,
      expandAllGroups,
      setAllSubsOpen,
      openColumnMenu,
      closeColumnMenu,
      openPicker,
      closePicker,
      setPickerQuery,
      addColumn,
      renameColumn,
      renameItemTitle,
      startColumnRename,
      updateColumnDraft,
      commitColumnRename,
      cancelColumnRename,
      deleteColumn,
      duplicateColumn,
      duplicateColumnToBoard,
      changeColumnKind,
      updateColumnSettings,
      resizeColumnPreview,
      resizeItemColumnPreview,
      commitItemColumnResize,
      resizeSubColumnPreview,
      commitSubColumnResize,
      onColumnDragStart,
      onColumnDragOver,
      onColumnDragEnd,
      collapseAllGroups,
      setSort,
      openCellMenu,
      closeCellMenu,
      openOwnerMenu,
      closeOwnerMenu,
      setPeopleQuery,
      openLabelEditor,
      closeLabelEditor,
      openConfigEditor,
      closeConfigEditor,
      addStatusDef,
      renameStatusDef,
      setStatusDefColor,
      deleteStatusDef,
      addLabelDef,
      renameLabelDef,
      setLabelDefColor,
      deleteLabelDef,
      addColumnOption,
      renameColumnOption,
      recolorColumnOption,
      deleteColumnOption,
      toggleColumnNotifyOnAssignment,
      updateColumnFormula,
      updateColumnLinkedBoard,
      updateColumnMirror,
      openTagEditor,
      closeTagEditor,
      addTagDef,
      createTagOnCell,
      setTagDefColor,
      deleteTagDef,
      setTagQuery,
      ensureLinkedBoardItems,
      closeAllOverlays,
      copyRowLink,
      openComments,
      openItem,
      requestGroupItems,
      undo,
      redo,
    }),
    [
      toggleItemOpen, toggleSelected, clearSelection, toggleGroupCollapsed, startEditName, updateEditDraft, commitEditName, cancelEditName,
      startGroupRename, updateGroupDraft, commitGroupRename, cancelGroupRename, setCellValue, toggleArrayValue,
      clearCellValue, uploadCellFiles, deleteCellFile, setActiveCell, clearActiveCell, moveActiveCell, copyActiveCell, pasteIntoActiveCell,
      startFillDrag, updateFillDragHover, commitFillDrag, cancelFillDrag,
      openRowMenu, closeRowMenu, addItem, addSubitem, deleteNode, createBelow, duplicateNode, toggleNodePriority, setItemRecurrence, clearItemRecurrence, moveItemToGroup,
      moveSubToItem, archiveNode, convertSubToItem, convertItemToSub, setHoverRow, setHoverGroup, setHoverHead, onDragStart, onDragOver, onDragEnd,
      openGroupMenu, closeGroupMenu, addGroup, duplicateGroup, moveGroupByKey, setGroupColor, togglePriority, removeGroup, archiveGroup, selectAllInGroup,
      expandAllGroups, setAllSubsOpen, openColumnMenu, closeColumnMenu, openPicker, closePicker, setPickerQuery, addColumn,
      renameColumn, renameItemTitle, startColumnRename, updateColumnDraft, commitColumnRename, cancelColumnRename, deleteColumn, duplicateColumn, duplicateColumnToBoard, changeColumnKind, updateColumnSettings, resizeColumnPreview, resizeItemColumnPreview, commitItemColumnResize, resizeSubColumnPreview, commitSubColumnResize, onColumnDragStart, onColumnDragOver, onColumnDragEnd, collapseAllGroups, setSort, openCellMenu, closeCellMenu, openOwnerMenu,
      closeOwnerMenu, setPeopleQuery, openLabelEditor, closeLabelEditor, openConfigEditor, closeConfigEditor, addStatusDef, renameStatusDef, setStatusDefColor,
      deleteStatusDef, addLabelDef, renameLabelDef, setLabelDefColor, deleteLabelDef, addColumnOption, renameColumnOption, recolorColumnOption, deleteColumnOption, toggleColumnNotifyOnAssignment, updateColumnFormula, updateColumnLinkedBoard, updateColumnMirror, openTagEditor, closeTagEditor, addTagDef, createTagOnCell,
      setTagDefColor, deleteTagDef, setTagQuery, ensureLinkedBoardItems, closeAllOverlays, copyRowLink, openComments, openItem, requestGroupItems, undo, redo,
    ]
  );

  /**
   * Purely view/navigation actions that stay functional under `config.read_only`
   * (see `UseBoardTableConfig.read_only`'s own doc comment) — everything else
   * on `actions` becomes a no-op below. Deny-by-default rather than an
   * exclude-list: a new mutating action added later is blocked automatically
   * instead of silently slipping through a guest's read-only view.
   */
  const READ_ONLY_SAFE_ACTIONS = new Set<keyof typeof actions>([
    "toggleItemOpen", "toggleSelected", "clearSelection", "toggleGroupCollapsed", "selectAllInGroup",
    "setActiveCell", "clearActiveCell", "moveActiveCell", "copyActiveCell",
    "openRowMenu", "closeRowMenu", "setHoverRow", "setHoverGroup", "setHoverHead",
    "openGroupMenu", "closeGroupMenu", "openColumnMenu", "closeColumnMenu",
    "openPicker", "closePicker", "setPickerQuery", "openCellMenu", "closeCellMenu",
    "openOwnerMenu", "closeOwnerMenu", "setPeopleQuery", "openLabelEditor", "closeLabelEditor",
    "openConfigEditor", "closeConfigEditor", "openTagEditor", "closeTagEditor", "setTagQuery", "ensureLinkedBoardItems",
    "closeAllOverlays", "copyRowLink", "openComments", "openItem", "requestGroupItems",
    "setSort", "collapseAllGroups", "expandAllGroups", "setAllSubsOpen",
  ]);

  /**
   * Actions that change the board's structure (groups, columns, column
   * settings and labels). No-ops when `config.can_edit_structure` is false.
   */
  const STRUCTURE_ACTIONS: (keyof typeof actions)[] = [
    "addGroup", "duplicateGroup", "moveGroupByKey", "setGroupColor", "togglePriority", "removeGroup", "archiveGroup",
    "startGroupRename", "commitGroupRename", "addColumn", "renameColumn", "renameItemTitle", "startColumnRename",
    "commitColumnRename", "deleteColumn", "duplicateColumn", "duplicateColumnToBoard", "changeColumnKind",
    "updateColumnSettings", "onColumnDragStart", "addStatusDef", "renameStatusDef", "setStatusDefColor", "deleteStatusDef",
    "addLabelDef", "renameLabelDef", "setLabelDefColor", "deleteLabelDef", "addColumnOption", "renameColumnOption",
    "recolorColumnOption", "deleteColumnOption", "toggleColumnNotifyOnAssignment", "updateColumnFormula",
    "updateColumnLinkedBoard", "updateColumnMirror",
  ];

  /** Row actions whose first argument is the row id, checked against `config.canEditNode`. */
  const NODE_ACTIONS = [
    "startEditName", "deleteNode", "createBelow", "duplicateNode", "toggleNodePriority", "setItemRecurrence",
    "clearItemRecurrence", "moveItemToGroup", "moveSubToItem", "archiveNode", "convertSubToItem", "convertItemToSub",
    "addSubitem", "onDragStart",
  ] as const;

  const guarded_actions = useMemo(() => {
    const noop = () => {};

    if (config.read_only) {
      return Object.fromEntries(
        Object.entries(actions).map(([key, fn]) => [key, READ_ONLY_SAFE_ACTIONS.has(key as keyof typeof actions) ? fn : noop])
      ) as typeof actions;
    }

    const can_edit_structure = config.can_edit_structure ?? true;
    const can_create_items = config.can_create_items ?? true;
    const canEditNode = config.canEditNode;
    const canEditColumn = config.canEditColumn;

    if (can_edit_structure && can_create_items && !canEditNode && !canEditColumn) return actions;

    const isCellEditable = (node_id: string, column_id: string) =>
      (canEditNode?.(node_id) ?? true) && (canEditColumn?.(column_id) ?? true);

    const guarded = { ...actions } as Record<string, unknown>;
    const wrap = <K extends keyof typeof actions>(key: K, isAllowed: (...args: Parameters<(typeof actions)[K]>) => boolean) => {
      const original = actions[key] as (...args: Parameters<(typeof actions)[K]>) => unknown;
      guarded[key] = (...args: Parameters<(typeof actions)[K]>) => (isAllowed(...args) ? original(...args) : undefined);
    };

    if (!can_edit_structure) {
      for (const key of STRUCTURE_ACTIONS) guarded[key] = noop;
    }
    if (!can_create_items) {
      guarded.addItem = noop;
      guarded.addGroup = noop;
    }

    wrap("setCellValue", (node_id, column_id) => isCellEditable(node_id, column_id));
    wrap("toggleArrayValue", (node_id, column_id) => isCellEditable(node_id, column_id));
    wrap("clearCellValue", (node_id, column_id) => isCellEditable(node_id, column_id));
    wrap("uploadCellFiles", (node_id, column_id) => isCellEditable(node_id, column_id));
    wrap("deleteCellFile", (node_id, column_id) => isCellEditable(node_id, column_id));
    wrap("startFillDrag", (node_id, column_id) => isCellEditable(node_id, column_id));
    wrap("pasteIntoActiveCell", () => {
      const active_cell = state_ref.current.active_cell;
      return active_cell ? isCellEditable(active_cell.node_id, active_cell.column_id) : false;
    });

    if (canEditNode) {
      for (const key of NODE_ACTIONS) {
        wrap(key, (...args: unknown[]) => canEditNode(String(args[0])));
      }
    }

    return guarded as typeof actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, config.read_only, config.can_edit_structure, config.can_create_items, config.canEditNode, config.canEditColumn]);

  return { state, actions: guarded_actions, summary_text, findNode: (id: string) => findNode(state.groups, id) };
}

export type BoardTableActions = ReturnType<typeof useBoardTable>["actions"];
