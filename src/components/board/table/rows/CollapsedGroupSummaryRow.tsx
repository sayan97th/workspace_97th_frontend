"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import { mainGridTemplate } from "../layoutUtils";
import { summaryForColumn } from "../summaryUtils";
import GroupHeaderLeft from "../group/GroupHeaderLeft";

interface CollapsedGroupSummaryRowProps {
  group: BoardTableGroup;
  group_index: number;
  group_count: number;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

const ROW_HEIGHT = 58;

/** Stand-in for a collapsed group: since its column-header row and summary footer are both
 *  hidden while collapsed, this single card keeps every column's aggregate (status
 *  distribution, number sum, timeline span) visible at a glance, mirroring Monday's own
 *  collapsed-group preview. */
export default function CollapsedGroupSummaryRow({ group, group_index, group_count, name_col_width, min_width, state, actions }: CollapsedGroupSummaryRowProps) {
  const main_tpl = mainGridTemplate(name_col_width, group.base_columns, group.custom_columns);
  const columns = group.base_columns.concat(group.custom_columns);

  return (
    <div className="flex items-stretch overflow-hidden rounded-[8px] border border-boardtree-border bg-boardtree-surface" style={{ minWidth: min_width }}>
      <div className="w-[5px] flex-none" style={{ background: group.color }} />

      <div className="flex-1" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="flex items-center pl-8" style={{ gridColumn: "span 3", height: ROW_HEIGHT }}>
          <GroupHeaderLeft group={group} group_index={group_index} group_count={group_count} state={state} actions={actions} />
        </div>

        {columns.map((col) => {
          const summary = summaryForColumn(group.items, col, state.status_defs);
          return (
            <div
              key={col.id}
              className="flex min-w-0 flex-col items-center justify-center gap-1 border-l border-boardtree-border-soft px-2.5"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="max-w-full truncate text-[10.5px] font-medium uppercase tracking-wide text-boardtree-text-faint">{col.title}</div>

              {summary.is_status && (
                <div className="flex h-[15px] w-full overflow-hidden rounded-[2px] bg-boardtree-track">
                  {summary.segments.map((seg) => (
                    <div key={seg.key} style={{ width: `${seg.width_pct}%`, background: seg.background }} />
                  ))}
                </div>
              )}

              {summary.is_number && (
                <>
                  <div className="w-full truncate text-center font-mono text-[13px] text-boardtree-text-secondary" title={summary.sum_value}>
                    {summary.sum_value}
                  </div>
                  <div className="text-[10.5px] text-boardtree-text-faint">sum</div>
                </>
              )}

              {summary.is_timeline && (
                <span
                  className="flex h-6 w-full min-w-0 items-center justify-center truncate rounded-full px-2 text-[11.5px] font-medium"
                  style={
                    summary.range_label
                      ? { background: "var(--color-boardtree-text)", color: "var(--color-boardtree-surface)" }
                      : { background: "var(--color-boardtree-track)", color: "var(--color-boardtree-text-faint)" }
                  }
                >
                  {summary.range_label || "–"}
                </span>
              )}

              {!summary.is_status && !summary.is_number && !summary.is_timeline && (
                <div className="text-[12px] text-boardtree-text-faint">–</div>
              )}
            </div>
          );
        })}

        <div style={{ height: ROW_HEIGHT }} />
        <div style={{ height: ROW_HEIGHT }} />
      </div>
    </div>
  );
}
