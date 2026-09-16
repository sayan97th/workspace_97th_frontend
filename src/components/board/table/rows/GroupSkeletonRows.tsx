"use client";

import type { ColumnDef } from "../types";
import { ROW_HEIGHT_PX, mainGridTemplate, mainStickyOffsets } from "../layoutUtils";
import TreeBar from "./TreeBar";

interface GroupSkeletonRowsProps {
  name_col_width: number;
  min_width: number;
  base_columns: ColumnDef[];
  custom_columns: ColumnDef[];
  color: string;
  row_height: "single" | "double" | "triple" | "quad";
  /** This table's real root item count, known up front from the backend even before its rows load — see `BoardTableGroup.item_count`. */
  item_count?: number;
  /** How many leading `base_columns` are pinned/frozen, see `UseBoardTableConfig.pinned_column_count`'s own doc comment. Defaults to 0. */
  pinned_column_count?: number;
}

/**
 * Placeholder rows shown in place of a table's real item rows while
 * `GroupSection`'s `IntersectionObserver` waits on `getItems` to resolve.
 * Row count is clamped from the table's own `item_count` (rather than always
 * rendering a fixed number) so a loading table occupies roughly its real
 * height and doesn't jump the scroll position once its rows actually render.
 */
export default function GroupSkeletonRows({ name_col_width, min_width, base_columns, custom_columns, color, row_height, item_count, pinned_column_count = 0 }: GroupSkeletonRowsProps) {
  const row_h = ROW_HEIGHT_PX[row_height];
  const main_tpl = mainGridTemplate(name_col_width, base_columns, custom_columns);
  const columns = base_columns.concat(custom_columns);
  const row_count = Math.min(6, Math.max(1, item_count ?? 3));
  const pinned_columns = base_columns.slice(0, pinned_column_count);
  const sticky_offsets = mainStickyOffsets(name_col_width, pinned_columns);
  const ROW_BG = "var(--color-boardtree-surface)";

  return (
    <div aria-hidden="true">
      {Array.from({ length: row_count }).map((_, row_index) => (
        <div key={row_index} className="relative flex items-stretch" style={{ minWidth: min_width }}>
          <TreeBar variant="thick" color={color} />
          <div className="flex-1 border-b border-boardtree-border-soft" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
            <div className="border-r border-boardtree-border-soft" style={{ height: row_h, position: "sticky", left: sticky_offsets[0], zIndex: 15, background: ROW_BG }} />
            <div className="flex items-center border-r border-boardtree-border-soft px-3" style={{ height: row_h, position: "sticky", left: sticky_offsets[1], zIndex: 15, background: ROW_BG }}>
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-boardtree-hover" />
            </div>
            <div className="border-r border-boardtree-border-soft" style={{ height: row_h, position: "sticky", left: sticky_offsets[2], zIndex: 15, background: ROW_BG }} />
            {columns.map((col, col_index) => {
              const is_pinned = col_index < pinned_columns.length;
              return (
                <div
                  key={col.id}
                  className="flex items-center justify-center border-r border-boardtree-border-soft px-2"
                  style={{
                    height: row_h,
                    position: is_pinned ? "sticky" : undefined,
                    left: is_pinned ? sticky_offsets[3 + col_index] : undefined,
                    zIndex: is_pinned ? 15 : undefined,
                    background: is_pinned ? ROW_BG : undefined,
                  }}
                >
                  <div className="h-3.5 w-3/5 animate-pulse rounded bg-boardtree-hover" style={{ animationDelay: `${row_index * 60}ms` }} />
                </div>
              );
            })}
            <div style={{ height: row_h }} />
            <div style={{ height: row_h }} />
          </div>
        </div>
      ))}
    </div>
  );
}
