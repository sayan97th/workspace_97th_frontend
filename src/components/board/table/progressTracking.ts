import type { BoardTableGroup, CellValue, ColumnDef, StatusDef } from "./types";
import { findDef } from "./colorUtils";

/*
 * Progress tracking, monday style: a read only battery that fills as the
 * row's Status columns reach "Done". The column tracks every Status column
 * of its table (same scope) with the same weight, unless its settings pick
 * some of them and weigh each one (`ColumnDef.progress_columns`).
 */

/** A Status label counts as done when it reads "Done", monday's default done label. */
const DONE_LABEL = /^done$/i;

/** A Status column the Progress tracking settings can offer. */
export interface ProgressStatusColumn {
  id: string;
  title: string;
}

/** One tracked Status column on one row: its current label and how much it weighs. */
export interface ProgressSegment {
  column_id: string;
  title: string;
  label: string;
  color: string | null;
  is_done: boolean;
  /** Share of the battery, 0 to 1. */
  weight: number;
}

export interface RowProgress {
  segments: ProgressSegment[];
  done_count: number;
  /** 0 to 100, rounded. */
  percent: number;
}

export const isDoneStatusLabel = (label: string | undefined | null): boolean => !!label && DONE_LABEL.test(label.trim());

/** The Status columns among `columns`, the ones a Progress tracking column can track. */
export const statusColumnsOf = (columns: ColumnDef[]): ColumnDef[] => columns.filter((column) => column.kind === "status");

/**
 * The Status columns a Progress tracking column tracks, each with its share of the battery.
 * Picked columns that no longer exist are skipped, and when none is left (or nothing was
 * picked) every Status column counts the same.
 */
export function trackedStatusColumns(column: Pick<ColumnDef, "progress_columns">, status_columns: ColumnDef[]): { column: ColumnDef; weight: number }[] {
  const picked = (column.progress_columns ?? [])
    .map((entry) => ({ column: status_columns.find((status_column) => status_column.id === entry.column_id), weight: Math.max(0, Number(entry.weight) || 0) }))
    .filter((entry): entry is { column: ColumnDef; weight: number } => !!entry.column);

  if (picked.length === 0) return status_columns.map((status_column) => ({ column: status_column, weight: 1 / status_columns.length }));

  const total = picked.reduce((sum, entry) => sum + entry.weight, 0);
  return picked.map((entry) => ({ column: entry.column, weight: total > 0 ? entry.weight / total : 1 / picked.length }));
}

/** How far one row is: which tracked Status columns are done and the weighted percent. */
export function rowProgressOf(
  column: Pick<ColumnDef, "progress_columns">,
  status_columns: ColumnDef[],
  values: Record<string, CellValue>,
  status_defs: StatusDef[]
): RowProgress {
  const segments = trackedStatusColumns(column, status_columns).map(({ column: status_column, weight }) => {
    const raw = values[status_column.id];
    const def = findDef(status_column.options ?? status_defs, typeof raw === "string" ? raw : "");
    const label = def?.label ?? "";
    return { column_id: status_column.id, title: status_column.title, label, color: label ? def?.color ?? null : null, is_done: isDoneStatusLabel(label), weight };
  });
  const done_weight = segments.reduce((sum, segment) => sum + (segment.is_done ? segment.weight : 0), 0);
  return {
    segments,
    done_count: segments.filter((segment) => segment.is_done).length,
    percent: segments.length ? Math.round(done_weight * 100) : 0,
  };
}

/** The columns of the table a row sits in: its group's item columns, or its subitem columns. */
export function scopeColumnsOfNode(groups: BoardTableGroup[], node_id: string): ColumnDef[] {
  for (const group of groups) {
    if (group.items.some((item) => item.id === node_id)) return [...group.base_columns, ...group.custom_columns];
    if (group.items.some((item) => item.subs.some((sub) => sub.id === node_id))) return [...group.sub_base_columns, ...group.sub_custom_columns];
  }
  return [];
}

/** Even weights that add up to exactly 100, the remainder going to the first columns. */
export function evenWeights(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}
