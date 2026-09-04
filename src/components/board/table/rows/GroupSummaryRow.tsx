import type { BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import { mainGridTemplate } from "../layoutUtils";
import { summaryForColumn } from "../summaryUtils";

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

  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <div className="w-[5px] flex-none" />
      <div className="flex-1" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="h-[46px]" />
        <div className="h-[46px]" />
        <div className="h-[46px] border-r border-boardtree-border-soft" />

        {columns.map((col) => {
          const summary = summaryForColumn(group.items, col, state.status_defs);
          return (
            <div
              key={col.id}
              className="flex h-[46px] flex-col items-center justify-center gap-0.5 border-r border-boardtree-border-soft bg-boardtree-surface px-2.5"
              style={{ borderTop: "1px solid var(--color-boardtree-border)", borderBottom: "1px solid var(--color-boardtree-border)" }}
            >
              {summary.is_status && summary.segments.length > 0 && (
                <div className="flex h-[15px] w-full overflow-hidden rounded-[2px] bg-boardtree-track">
                  {summary.segments.map((seg) => (
                    <div key={seg.key} style={{ width: `${seg.width_pct}%`, background: seg.background }} />
                  ))}
                </div>
              )}
              {summary.is_number && (
                <>
                  <div className="font-mono text-[13px] text-boardtree-text-secondary">{summary.sum_value}</div>
                  <div className="text-[10.5px] text-boardtree-text-faint">sum</div>
                </>
              )}
            </div>
          );
        })}

        <div className="h-[46px]" />
        <div className="h-[46px]" />
      </div>
    </div>
  );
}
