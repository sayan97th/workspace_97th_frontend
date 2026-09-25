import type { ActiveCell, ColumnDef } from "./types";
import type { VisibleRow } from "./treeUtils";

/**
 * A rectangular block of cells in the table, in `visibleRowSequence` terms:
 * a span of on screen rows and a span of column positions. Item and subitem
 * rows have their own column lists, so the column span is applied to each
 * row's own list, the same way the arrow keys already move between them.
 */
export interface CellRangeBounds {
  row_start: number;
  row_end: number;
  col_start: number;
  col_end: number;
}

export interface CellRangeRow {
  node_id: string;
  group_key: string;
  columns: ColumnDef[];
}

export function cellKey(node_id: string, column_id: string): string {
  return `${node_id}:${column_id}`;
}

/** The block between the anchor (where a Shift+click or drag started) and the focused cell. Null when either cell is no longer on screen. */
export function rangeBounds(rows: VisibleRow[], anchor: ActiveCell | null, focus: ActiveCell | null): CellRangeBounds | null {
  if (!focus) return null;
  const start = anchor ?? focus;

  const anchor_row = rows.findIndex((row) => row.node_id === start.node_id);
  const focus_row = rows.findIndex((row) => row.node_id === focus.node_id);
  if (anchor_row < 0 || focus_row < 0) return null;

  const anchor_col = rows[anchor_row].columns.findIndex((column) => column.id === start.column_id);
  const focus_col = rows[focus_row].columns.findIndex((column) => column.id === focus.column_id);
  if (anchor_col < 0 || focus_col < 0) return null;

  return {
    row_start: Math.min(anchor_row, focus_row),
    row_end: Math.max(anchor_row, focus_row),
    col_start: Math.min(anchor_col, focus_col),
    col_end: Math.max(anchor_col, focus_col),
  };
}

/** Every row of the block with the columns it covers on that row, top to bottom. */
export function rangeRows(rows: VisibleRow[], bounds: CellRangeBounds): CellRangeRow[] {
  return rows.slice(bounds.row_start, bounds.row_end + 1).map((row) => ({
    node_id: row.node_id,
    group_key: row.group_key,
    columns: row.columns.slice(bounds.col_start, bounds.col_end + 1),
  }));
}

/** The block's cells as `node_id:column_id` keys, for highlighting. */
export function rangeCellKeys(rows: VisibleRow[], bounds: CellRangeBounds | null): Set<string> {
  const keys = new Set<string>();
  if (!bounds) return keys;
  for (const row of rangeRows(rows, bounds)) {
    for (const column of row.columns) keys.add(cellKey(row.node_id, column.id));
  }
  return keys;
}

export function isMultiCellRange(bounds: CellRangeBounds | null): boolean {
  return !!bounds && (bounds.row_start !== bounds.row_end || bounds.col_start !== bounds.col_end);
}
