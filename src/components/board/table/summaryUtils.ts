import type { ColumnDef, StatusDef, BoardTableItem } from "./types";
import { findDef } from "./colorUtils";

export interface StatusSegment {
  key: string;
  width_pct: number;
  background: string;
}

export interface ColumnSummary {
  column_id: string;
  is_status: boolean;
  is_number: boolean;
  segments: StatusSegment[];
  sum_value: string;
}

function numberValueOf(item: BoardTableItem, column_id: string): number {
  const raw = item.values[column_id];
  if (typeof raw !== "string") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Aggregates a group's items into the status-distribution / numeric-sum shown by the group's summary row. */
export function summaryForColumn(items: BoardTableItem[], column: ColumnDef, status_defs: StatusDef[]): ColumnSummary {
  const base: ColumnSummary = { column_id: column.id, is_status: false, is_number: false, segments: [], sum_value: "0" };

  if (column.kind === "status") {
    const defs = column.options ?? status_defs;
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const value = item.values[column.id];
      const raw_value = typeof value === "string" ? value : "";
      if (raw_value) counts[raw_value] = (counts[raw_value] || 0) + 1;
    });
    const total = items.length || 1;
    const segments = Object.keys(counts).map((raw_value) => ({
      key: raw_value,
      width_pct: Math.round((counts[raw_value] / total) * 100),
      background: findDef(defs, raw_value)?.color || "#c9ccd4",
    }));
    return { ...base, is_status: true, segments };
  }

  if (column.kind === "number") {
    const sum = items.reduce((acc, item) => acc + numberValueOf(item, column.id), 0);
    return { ...base, is_number: true, sum_value: String(sum) };
  }

  return base;
}
