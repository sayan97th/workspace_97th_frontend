import type { BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import { mainGridTemplate, mainStickyOffsets } from "../layoutUtils";
import { NUMBER_AGGREGATION_LABELS, summaryForColumn } from "../summaryUtils";

interface GroupSummaryRowProps {
  group: BoardTableGroup;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
}

/** Sticky-free footer row shown at the bottom of every expanded group: a status distribution
 *  bar per status column and a running total per number column, mirroring Monday's board summary row. */
export default function GroupSummaryRow({ group, name_col_width, min_width, state }: GroupSummaryRowProps) {
  const main_tpl = mainGridTemplate(name_col_width, group.base_columns, group.custom_columns);
  const columns = group.base_columns.concat(group.custom_columns);
  const pinned_columns = group.base_columns.slice(0, state.pinned_column_count);
  const sticky_offsets = mainStickyOffsets(name_col_width, pinned_columns);
  // The leading cells under Item stay page colored, so the summary reads as a strip under the value columns only.
  const ROW_BG = "var(--color-boardtree-bg)";

  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <div className="w-[5px] flex-none" />
      <div className="flex-1" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="h-9" style={{ position: "sticky", left: sticky_offsets[0], zIndex: 15, background: ROW_BG }} />
        <div className="h-9" style={{ position: "sticky", left: sticky_offsets[1], zIndex: 15, background: ROW_BG }} />
        <div className="h-9 border-r border-boardtree-grid" style={{ position: "sticky", left: sticky_offsets[2], zIndex: 15, background: ROW_BG }} />

        {columns.map((col, col_index) => {
          const summary = summaryForColumn(group.items, col, state.status_defs);
          const is_pinned = col_index < pinned_columns.length;
          return (
            <div
              key={col.id}
              className="flex h-9 min-w-0 flex-col items-center justify-center border-r border-boardtree-grid bg-boardtree-surface px-2"
              style={{
                borderTop: "1px solid var(--color-boardtree-grid)",
                borderBottom: "1px solid var(--color-boardtree-grid)",
                position: is_pinned ? "sticky" : undefined,
                left: is_pinned ? sticky_offsets[3 + col_index] : undefined,
                zIndex: is_pinned ? 15 : undefined,
              }}
            >
              {summary.is_status && summary.segments.length > 0 && (
                <div className="flex h-6 w-full overflow-hidden bg-boardtree-track">
                  {summary.segments.map((seg) => (
                    <div key={seg.key} style={{ width: `${seg.width_pct}%`, background: seg.background }} />
                  ))}
                </div>
              )}
              {summary.is_number && (
                <>
                  <div className="w-full truncate text-center text-board-cell leading-[16px] text-boardtree-text" title={summary.sum_value}>
                    {summary.sum_value}
                  </div>
                  <div className="text-[11px] leading-[12px] text-boardtree-text-secondary">{NUMBER_AGGREGATION_LABELS[summary.aggregation]}</div>
                </>
              )}
              {summary.is_timeline && (
                <span
                  className="flex h-6 w-full min-w-0 items-center justify-center truncate rounded-full px-2 text-board-cell text-white"
                  style={
                    summary.range_label
                      ? { background: group.color }
                      : { background: "var(--color-boardtree-empty)" }
                  }
                >
                  {summary.range_label || "-"}
                </span>
              )}
            </div>
          );
        })}

        <div className="h-9" />
        <div className="h-9" />
      </div>
    </div>
  );
}
