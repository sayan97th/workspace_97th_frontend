"use client";
import React, { useState } from "react";
import { BOARD_ROW_HEIGHT_PX, type BoardColumn, type BoardTableProps } from "./types";

/** Left-most checkbox column width (kept out of the column config). */
const CHECKBOX_WIDTH = 44;

const BoardCheckbox: React.FC<{ borderColor?: string }> = ({ borderColor = "#3b4746" }) => (
  <span
    className="h-[15px] w-[15px] flex-none cursor-pointer rounded"
    style={{ border: `1.5px solid ${borderColor}` }}
  />
);

type ColumnCellProps = {
  column: BoardColumn;
  children?: React.ReactNode;
  isHeader?: boolean;
};

const ColumnCell: React.FC<ColumnCellProps> = ({ column, children, isHeader }) => {
  const alignment = column.align === "center" ? "justify-center" : "justify-start";
  const padding = column.bleed ? "" : "px-3";
  return (
    <div
      className={`flex flex-none items-center ${alignment} ${padding} border-r ${
        isHeader ? "border-white/[0.05]" : "border-white/[0.04]"
      }`}
      style={{ width: column.width }}
    >
      {children}
    </div>
  );
};

/**
 * Generic, reusable Monday-style board table. It owns group collapse state and
 * the fixed-column layout; callers supply the columns, grouped rows and a
 * `renderCell` function, so any future board view can reuse this shell.
 */
function BoardTable<TRow>({
  columns,
  groups,
  getRowId,
  renderCell,
  minWidth = 1450,
  rowHeight = "medium",
}: BoardTableProps<TRow>) {
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const row_height_px = BOARD_ROW_HEIGHT_PX[rowHeight];

  const toggleGroup = (id: string) => {
    setCollapsedGroupIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-[34px]" style={{ minWidth }}>
      {groups.map((group) => {
        const is_expanded = !collapsed_group_ids[group.id];
        const is_empty = group.rows.length === 0;

        return (
          <div key={group.id}>
            {/* Group header */}
            <div className="flex items-center gap-[9px] px-0 pb-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md transition-transform duration-150"
                style={{
                  color: group.accent_color,
                  transform: is_expanded ? "rotate(0deg)" : "rotate(-90deg)",
                }}
                aria-label={`Toggle ${group.name}`}
              >
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5 L6 7.5 L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span
                className="text-base font-bold tracking-[-0.01em]"
                style={{ color: group.accent_color }}
              >
                {group.name}
              </span>
              <span className="text-xs font-medium text-[#6e7b7d]">{group.rows.length}</span>
            </div>

            {is_expanded && (
              <div className="overflow-hidden rounded-t-[7px]">
                {/* Column header row */}
                <div
                  className="flex items-stretch border-t border-white/[0.07] bg-[#132322] text-[12.5px] font-semibold text-[#8a9495]"
                  style={{ borderLeft: `4px solid ${group.accent_color}` }}
                >
                  <div
                    className="flex flex-none items-center justify-center border-r border-white/[0.05] py-[11px]"
                    style={{ width: CHECKBOX_WIDTH }}
                  >
                    <BoardCheckbox borderColor="#4a5658" />
                  </div>
                  {columns.map((column) => (
                    <ColumnCell key={column.id} column={column} isHeader>
                      <span className="truncate py-[11px]">{column.label}</span>
                    </ColumnCell>
                  ))}
                </div>

                {/* Empty state */}
                {is_empty && (
                  <div
                    className="flex items-center border-t border-white/[0.05] bg-[#0c1b1a]"
                    style={{ borderLeft: `4px solid ${group.accent_color}`, height: row_height_px }}
                  >
                    <div
                      className="flex flex-none items-center justify-center"
                      style={{ width: CHECKBOX_WIDTH }}
                    >
                      <BoardCheckbox borderColor="#35413f" />
                    </div>
                    <div className="px-3 text-[13px] text-[#5e6b6c]">+ Add item</div>
                  </div>
                )}

                {/* Rows */}
                {group.rows.map((row) => (
                  <div
                    key={getRowId(row)}
                    className="flex items-stretch border-t border-white/[0.05] bg-[#0c1b1a] transition-colors hover:bg-[#112423]"
                    style={{ borderLeft: `4px solid ${group.accent_color}` }}
                  >
                    <div
                      className="flex flex-none items-center justify-center border-r border-white/[0.04]"
                      style={{ width: CHECKBOX_WIDTH }}
                    >
                      <BoardCheckbox />
                    </div>
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className={`flex flex-none items-center border-r border-white/[0.04] ${
                          column.align === "center" ? "justify-center" : "justify-start"
                        } ${column.bleed ? "" : "px-3"}`}
                        style={{ width: column.width, height: row_height_px }}
                      >
                        {renderCell(row, column)}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Add-item footer */}
                {!is_empty && (
                  <div
                    className="flex h-10 items-center border-t border-white/[0.05] bg-[#0c1b1a]"
                    style={{ borderLeft: `4px solid ${group.accent_color}` }}
                  >
                    <div
                      className="flex flex-none items-center justify-center"
                      style={{ width: CHECKBOX_WIDTH }}
                    >
                      <BoardCheckbox borderColor="#35413f" />
                    </div>
                    <div className="px-3 text-[13px] text-[#5e6b6c]">+ Add item</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BoardTable;
