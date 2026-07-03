import type { ReactNode } from "react";

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
};

/** A collapsible group of rows (e.g. "Active Contracts"). */
export type BoardGroup<TRow> = {
  id: string;
  name: string;
  /** Accent colour for the group caret, title and the left row border. */
  accent_color: string;
  rows: TRow[];
};

/** Props shared by every board view built on top of {@link BoardTable}. */
export type BoardTableProps<TRow> = {
  columns: BoardColumn[];
  groups: BoardGroup<TRow>[];
  getRowId: (row: TRow) => string;
  renderCell: (row: TRow, column: BoardColumn) => ReactNode;
  /** Minimum table width so columns keep their size and scroll horizontally. */
  minWidth?: number;
};
