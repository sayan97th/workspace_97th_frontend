import type { ReactNode } from "react";
import type { AddableColumnType } from "./columnTypes";

/** Colour + glyph identifying a column's data type across the Sort/Group-by/Hide pickers. */
export type BoardColumnSwatch = {
  accent_color: string;
  glyph: string;
  /** Defaults to white; pale accent colours (e.g. yellow) need a dark glyph colour. */
  glyph_text_color?: string;
};

/** A single column definition for a {@link BoardTable}. */
export type BoardColumn = {
  id: string;
  label: string;
  /** Fixed width in pixels (Monday-style boards use fixed columns). */
  width: number;
  align?: "left" | "center";
  /**
   * When true the cell renders edge-to-edge with no padding — used for
   * full-bleed coloured cells such as Status and Partner Program.
   */
  bleed?: boolean;
  /** Whether this column can be hidden via the toolbar's Hide control. Defaults to true. */
  hideable?: boolean;
  /** Whether this column can be frozen via the toolbar's Pin columns control. Defaults to true. */
  pinnable?: boolean;
  /** Colour + glyph badge shown next to this column in the Hide-columns picker. */
  swatch?: BoardColumnSwatch;
  /** Full descriptive label for pickers with more room than the in-table header (which may truncate, e.g. "Client ..."). Defaults to `label`. */
  full_label?: string;
  /** Whether this column's header can be renamed inline (see {@link BoardTableProps.onRenameColumn}). Defaults to true when a rename handler is provided. */
  renamable?: boolean;
};

/** A collapsible group of rows (e.g. "Active Contracts"). */
export type BoardGroup<TRow> = {
  id: string;
  name: string;
  /** Accent colour for the group caret, title and the left row border. */
  accent_color: string;
  rows: TRow[];
};

/** Row height presets toggled from the toolbar's overflow menu ("Item height" submenu). */
export type BoardRowHeight = "single" | "double" | "triple";

export const BOARD_ROW_HEIGHT_PX: Record<BoardRowHeight, number> = {
  single: 42,
  double: 68,
  triple: 94,
};

/** Props shared by every board view built on top of {@link BoardTable}. */
export type BoardTableProps<TRow> = {
  columns: BoardColumn[];
  groups: BoardGroup<TRow>[];
  getRowId: (row: TRow) => string;
  renderCell: (row: TRow, column: BoardColumn) => ReactNode;
  /**
   * Floor for the table width in pixels. The table normally sizes itself to the
   * real total width of its columns (so it grows as columns are added and each
   * row's background paints edge-to-edge), and always fills at least the
   * viewport. This value only kicks in when the columns add up to less than it,
   * keeping a consistent minimum. Defaults to 1450 (the Client Hub baseline).
   */
  minWidth?: number;
  /** Row height preset. Defaults to "medium" (today's fixed 42px rows). */
  rowHeight?: BoardRowHeight;
  /** Column ids frozen to the left edge of the table via the toolbar's Pin columns control. */
  pinnedColumnIds?: string[];
  /** Row-id → background color, from the toolbar's Conditional coloring rules (scope "row"). */
  rowColors?: Record<string, string>;
  /** Row-id → column-id → background color, from the toolbar's Conditional coloring rules (scope "cell"). */
  cellColors?: Record<string, Record<string, string>>;
  /** Opens a row's detail (e.g. a {@link BoardItemDrawer}) when the row body is clicked; the checkbox gutter is exempt (see the checkbox cell's own click handler) so it never triggers this. */
  onRowClick?: (row: TRow) => void;
  /** Row-id of the row whose detail is currently open (e.g. in a {@link BoardItemDrawer}); it's painted with a highlight background and a checked checkbox. */
  selectedRowId?: string | null;
  /**
   * Row-ids checked for bulk actions (independent of {@link selectedRowId},
   * which tracks the single row whose drawer is open) — drives each row's
   * checkbox and a blue selection highlight. Omit to keep every row's
   * checkbox display-only.
   */
  selectedRowIds?: Set<string>;
  /** Clicking a row's own checkbox toggles its membership in {@link selectedRowIds}. */
  onToggleRowSelection?: (row_id: string) => void;
  /** Clicking a table's header checkbox toggles every one of that group's (currently visible) rows in/out of {@link selectedRowIds} at once. */
  onToggleGroupSelection?: (group_id: string) => void;
  /** Clicking the group's static "+ Add item" footer opens its inline input (see {@link addingItemGroupId}). Omit to keep the footer display-only. */
  onAddItem?: (group_id: string) => void;
  /** Group id whose "+ Add item" footer is currently showing its inline text input instead of the static label. */
  addingItemGroupId?: string | null;
  /** Submits the inline add-item input: called with the trimmed, non-empty name the user typed. */
  onSubmitNewItem?: (group_id: string, name: string) => void;
  /** Dismisses the inline add-item input without creating anything (Escape, or blur while empty). */
  onCancelAddItem?: () => void;
  /**
   * Clicking a group's title swaps it for an inline text input (see
   * {@link BoardGroup}'s `name`). Called on commit with the trimmed, changed
   * name. Omit to keep group titles display-only (e.g. Client Hub's static mockup).
   */
  onRenameGroup?: (group_id: string, name: string) => void;
  /**
   * Clicking a column header swaps it for an inline text input (see
   * {@link BoardColumn}'s `label`). Called on commit with the trimmed, changed
   * label. Columns opt out individually via `BoardColumn.renamable = false`.
   * Omit to keep every column header display-only.
   */
  onRenameColumn?: (column_id: string, label: string) => void;
  /**
   * Renders a "+ Add new group" footer button below the last group. Clicking
   * it should immediately append a new table at the bottom of the view
   * (Monday-style) — the caller creates it with a default name; the new
   * group's title can then be renamed inline via {@link onRenameGroup}.
   * Omit to hide the footer entirely.
   */
  onAddGroup?: () => void;
  /**
   * Renders a trailing "+" button after the last column header. Clicking it
   * opens the reusable {@link AddColumnMenu}; picking a type calls this with the
   * chosen {@link AddableColumnType} so the caller can create the column. Omit
   * to hide the button (e.g. Client Hub's static mockup).
   */
  onAddColumn?: (type: AddableColumnType) => void;
  /**
   * A root row's direct subitems (Monday-style — exactly one level deep, a
   * subitem never has children of its own) — return `undefined`/an empty
   * array for a row with none. Omit entirely to keep every row flat
   * (unchanged default behavior).
   */
  getChildren?: (row: TRow) => TRow[] | undefined;
  /**
   * A row's subitem count, shown as a "N Subitems" badge while the row is
   * collapsed (even before its children are otherwise known). Defaults to
   * `getChildren(row)?.length ?? 0` when omitted.
   */
  getSubitemCount?: (row: TRow) => number;
  /** Which column hosts the expand caret, indentation and subitem badge. Defaults to the first column. */
  treeColumnId?: string;
  /** Clicking a row's static "+ Add subitem" footer opens its inline input (see {@link addingSubitemParentId}). Omit to hide the affordance entirely. */
  onAddSubitem?: (parent_row_id: string) => void;
  /** Row id whose "+ Add subitem" footer is currently showing its inline text input instead of the static label. */
  addingSubitemParentId?: string | null;
  /** Submits the inline add-subitem input: called with the parent row id and the trimmed, non-empty name the user typed. */
  onSubmitNewSubitem?: (parent_row_id: string, name: string) => void;
  /** Dismisses the inline add-subitem input without creating anything. */
  onCancelAddSubitem?: () => void;
  /**
   * The subitem panel's own column set — independent from {@link columns},
   * mirroring monday.com's subitems living on an implicit separate sub-board
   * with their own columns rather than reusing the parent item's. Required
   * for subitems to render at all; the first column is always the panel's
   * tree/name column (its header always reads "Subitem", regardless of its
   * actual `label`).
   */
  subitemColumns?: BoardColumn[];
  /** Renders a trailing "+" button after the subitem panel's own last column header, mirroring {@link onAddColumn} but for `subitemColumns`. Omit to hide it. */
  onAddSubitemColumn?: (type: AddableColumnType) => void;
};
