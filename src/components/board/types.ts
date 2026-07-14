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
};

/** A collapsible group of rows (e.g. "Active Contracts"). */
export type BoardGroup<TRow> = {
  id: string;
  name: string;
  /** Accent colour for the group caret, title and the left row border. */
  accent_color: string;
  rows: TRow[];
};

/** Row height presets toggled from the toolbar's overflow menu. */
export type BoardRowHeight = "small" | "medium" | "large";

export const BOARD_ROW_HEIGHT_PX: Record<BoardRowHeight, number> = {
  small: 34,
  medium: 42,
  large: 54,
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
};
