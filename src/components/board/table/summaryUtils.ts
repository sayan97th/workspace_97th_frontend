import type { ColumnDef, StatusDef, BoardTableItem } from "./types";

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

function statusColorOf(label: string, status_defs: StatusDef[]): string {
  return status_defs.find((def) => def.label === label)?.color || "#c9ccd4";
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
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const value = item.values[column.id];
      const label = typeof value === "string" ? value : "";
      if (label) counts[label] = (counts[label] || 0) + 1;
    });
    const total = items.length || 1;
    const segments = Object.keys(counts).map((label) => ({
      key: label,
      width_pct: Math.round((counts[label] / total) * 100),
      background: statusColorOf(label, status_defs),
    }));
    return { ...base, is_status: true, segments };
  }

  if (column.kind === "number") {
    const sum = items.reduce((acc, item) => acc + numberValueOf(item, column.id), 0);
    return { ...base, is_number: true, sum_value: String(sum) };
  }

  return base;
}
