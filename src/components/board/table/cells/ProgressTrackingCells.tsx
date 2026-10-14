"use client";

import type { CellValue, ColumnDef } from "../types";
import type { BoardTableState } from "../useBoardTable";
import { rowProgressOf, scopeColumnsOfNode, statusColumnsOf, type RowProgress } from "../progressTracking";
import { useCellTooltip } from "./CellTooltip";
import "./progress-tracking-cells.css";

interface ProgressBatteryProps {
  percent: number;
  size?: "md" | "sm";
  /** Read by screen readers, defaults to "N% done". */
  label?: string;
}

/** The battery itself: an outlined bar filled up to `percent` with the percent next to it. */
export function ProgressBattery({ percent, size = "md", label }: ProgressBatteryProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <span className={`progress-battery progress-battery--${size}${clamped === 100 ? " is-complete" : ""}`}>
      <span
        className="progress-battery__bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label ?? `${clamped}% done`}
      >
        <span className="progress-battery__fill" style={{ width: `${clamped}%` }} />
      </span>
      <span className="progress-battery__percent">{clamped}%</span>
    </span>
  );
}

/** The cell's hover card: how many tracked columns are done, then each column with its label. */
function ProgressTooltip({ progress, has_custom_weights }: { progress: RowProgress; has_custom_weights: boolean }) {
  return (
    <span className="progress-tooltip">
      <span className="progress-tooltip__title">
        {progress.done_count} of {progress.segments.length} done
      </span>
      {progress.segments.map((segment) => (
        <span key={segment.column_id} className="progress-tooltip__row">
          <span className="progress-tooltip__dot" style={segment.color ? { background: segment.color } : undefined} aria-hidden="true" />
          <span className="progress-tooltip__column">{segment.title}</span>
          <span className={`progress-tooltip__label${segment.label ? "" : " is-empty"}`}>{segment.label || "Empty"}</span>
          {has_custom_weights && <span className="progress-tooltip__weight">{Math.round(segment.weight * 100)}%</span>}
        </span>
      ))}
    </span>
  );
}

interface ProgressTrackingCellProps {
  node_id: string;
  column: ColumnDef;
  values: Record<string, CellValue>;
  state: BoardTableState;
}

/**
 * Read only Progress tracking cell: the battery fills with the weighted share of the
 * tracked Status columns set to "Done", and hovering it lists each one with its label.
 */
export function ProgressTrackingCell({ node_id, column, values, state }: ProgressTrackingCellProps) {
  const status_columns = statusColumnsOf(scopeColumnsOfNode(state.groups, node_id));
  const progress = rowProgressOf(column, status_columns, values, state.status_defs);
  const has_custom_weights = !!column.progress_columns?.length;
  const tooltip = useCellTooltip<HTMLDivElement>(
    progress.segments.length > 0 ? <ProgressTooltip progress={progress} has_custom_weights={has_custom_weights} /> : "Add a Status column to track progress"
  );

  return (
    <div {...tooltip.anchor_props} className="progress-cell">
      {progress.segments.length > 0 ? <ProgressBattery percent={progress.percent} /> : <span className="progress-cell__empty">Add a Status column</span>}
      {tooltip.tooltip}
    </div>
  );
}

/** The group summary footer's battery: the average progress of the group's items. */
export function ProgressTrackingSummary({ percent, is_compact = false }: { percent: number | null; is_compact?: boolean }) {
  if (percent === null) return <span className="progress-cell__empty">No Status columns</span>;
  return (
    <span className="progress-summary" title={`Average progress ${percent}%`}>
      <ProgressBattery percent={percent} size={is_compact ? "sm" : "md"} label={`Average progress ${percent}%`} />
    </span>
  );
}
