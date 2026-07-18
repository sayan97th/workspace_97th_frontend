import type { ReactNode } from "react";

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
  /** Minimum table width so columns keep their size and scroll horizontally. */
  minWidth?: number;
  /** Row height preset. Defaults to "medium" (today's fixed 42px rows). */
  rowHeight?: BoardRowHeight;
  /** Column ids frozen to the left edge of the table via the toolbar's Pin columns control. */
  pinnedColumnIds?: string[];
  /** Row-id → background color, from the toolbar's Conditional coloring rules (scope "row"). */
  rowColors?: Record<string, string>;
  /** Row-id → column-id → background color, from the toolbar's Conditional coloring rules (scope "cell"). */
  cellColors?: Record<string, Record<string, string>>;
  /** Opens a row's detail (e.g. a {@link BoardItemDrawer}) when the row body is clicked. */
  onRowClick?: (row: TRow) => void;
  /** Row-id of the row whose detail is currently open (e.g. in a {@link BoardItemDrawer}); it's painted with a highlight background and a checked checkbox. */
  selectedRowId?: string | null;
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
};
