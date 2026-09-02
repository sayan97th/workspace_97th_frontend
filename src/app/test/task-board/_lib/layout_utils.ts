import type { ColumnDef } from "../_types/board.types";

export function computeNameColWidth(names: string[]): number {
  const longest = names.reduce((a, n) => Math.max(a, (n || "").length), 0);
  return Math.min(420, Math.max(280, Math.round(longest * 7.2) + 96));
}

export function computeSubNameColWidth(names: string[]): number {
  const longest = names.reduce((a, n) => Math.max(a, (n || "").length), 0);
  return Math.min(340, Math.max(150, Math.round(longest * 6.9) + 53));
}

/** Combined grid-template-columns for a group's main item rows: leading fixed cells,
 *  base columns, custom columns, then the trailing add-column button + flex spacer. */
export function mainGridTemplate(name_col_width: number, base_columns: ColumnDef[], custom_columns: ColumnDef[] = []): string {
  const widths = base_columns.concat(custom_columns).map((c) => `${c.width}px`).join(" ");
  return `36px ${name_col_width}px 56px ${widths} 44px 1fr`;
}

/** Same idea, scoped to a single item's subitem tree. */
export function subGridTemplate(name_col_width: number, sub_base_columns: ColumnDef[], sub_custom_columns: ColumnDef[] = []): string {
  const widths = sub_base_columns.concat(sub_custom_columns).map((c) => `${c.width}px`).join(" ");
  return `34px ${name_col_width}px 52px ${widths} 44px 1fr`;
}

export function columnsWidthSum(columns: ColumnDef[]): number {
  return columns.reduce((a, c) => a + c.width, 0);
}

/** Minimum scrollable width for a group's main item rows (bar + leading cells + columns + add-column button). */
export function mainMinWidth(name_col_width: number, base_columns: ColumnDef[], custom_columns: ColumnDef[]): number {
  return 5 + 36 + name_col_width + 56 + columnsWidthSum(base_columns) + columnsWidthSum(custom_columns) + 44;
}

/** Minimum scrollable width for one item's subitem tree — never narrower than the parent group's own min width. */
export function subMinWidth(
  main_min_width: number,
  sub_name_col_width: number,
  sub_base_columns: ColumnDef[],
  sub_custom_columns: ColumnDef[]
): number {
  const sub_total = 30 + 5 + 34 + sub_name_col_width + 52 + columnsWidthSum(sub_base_columns) + columnsWidthSum(sub_custom_columns) + 44;
  return Math.max(main_min_width, sub_total);
}
