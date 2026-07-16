"use client";
import React, { useMemo, useState } from "react";
import { CheckIcon } from "@/icons/board-icons";
import { BOARD_ROW_HEIGHT_PX, type BoardColumn, type BoardTableProps } from "./types";

/** Left-most checkbox column width (kept out of the column config). */
const CHECKBOX_WIDTH = 44;

/** Row backgrounds pinned cells must paint explicitly so they stay opaque over columns scrolling underneath. */
const HEADER_STICKY_BG = "var(--color-shell-panel-alt)";
const ROW_STICKY_BG = "var(--color-shell-bg)";
const STICKY_BOX_SHADOW = "1px 0 0 var(--color-shell-border-strong)";
/** Background of the row whose detail drawer is open — a green-tinted mix over the row surface, reactive to the active theme. */
const SELECTED_ROW_BG = "color-mix(in srgb, var(--color-shell-panel-alt) 78%, var(--color-success-500) 22%)";

const BoardCheckbox: React.FC<{ borderColor?: string; checked?: boolean }> = ({ borderColor = "var(--color-shell-border-strong)", checked }) => (
  <span
    className="flex h-[15px] w-[15px] flex-none cursor-pointer items-center justify-center rounded"
    style={checked ? { background: "#0073ea" } : { border: `1.5px solid ${borderColor}` }}
  >
    {checked && <CheckIcon size={10} className="text-white" />}
  </span>
);

type ColumnCellProps = {
  column: BoardColumn;
  children?: React.ReactNode;
  isHeader?: boolean;
  pinStyle?: React.CSSProperties;
};

const ColumnCell: React.FC<ColumnCellProps> = ({ column, children, isHeader, pinStyle }) => {
  const alignment = column.align === "center" ? "justify-center" : "justify-start";
  const padding = column.bleed ? "" : "px-3";
  return (
    <div
      className={`flex flex-none items-center ${alignment} ${padding} border-r border-shell-border`}
      style={{ width: column.width, ...pinStyle }}
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
  rowHeight = "single",
  pinnedColumnIds = [],
  rowColors = {},
  cellColors = {},
  onRowClick,
  selectedRowId = null,
  onAddItem,
}: BoardTableProps<TRow>) {
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const row_height_px = BOARD_ROW_HEIGHT_PX[rowHeight];
  const has_pinned_columns = pinnedColumnIds.length > 0;

  const toggleGroup = (id: string) => {
    setCollapsedGroupIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /** Left offset of each pinned column, accumulated in table order among pinned columns only. */
  const pinned_lefts = useMemo(() => {
    const lefts: Record<string, number> = {};
    let left = has_pinned_columns ? CHECKBOX_WIDTH : 0;
    columns.forEach((column) => {
      if (!pinnedColumnIds.includes(column.id)) return;
      lefts[column.id] = left;
      left += column.width;
    });
    return lefts;
  }, [columns, pinnedColumnIds, has_pinned_columns]);

  const checkboxPinStyle: React.CSSProperties | undefined = has_pinned_columns
    ? { position: "sticky", left: 0, zIndex: 6, boxShadow: STICKY_BOX_SHADOW }
    : undefined;

  /** Sticky style for a data column cell, or undefined when it isn't pinned. Bleed columns (Status/Partner) skip the background so their own full-bleed colour keeps showing. */
  const getColumnPinStyle = (column: BoardColumn, background: string): React.CSSProperties | undefined => {
    const left = pinned_lefts[column.id];
    if (left === undefined) return undefined;
    return {
      position: "sticky",
      left,
      zIndex: 5,
      boxShadow: STICKY_BOX_SHADOW,
      ...(column.bleed ? {} : { background }),
    };
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
              <span className="text-xs font-medium text-shell-text-faint">{group.rows.length}</span>
            </div>

            {is_expanded && (
              <div>
                {/*
                  No overflow-hidden here: it would create its own scroll container and break
                  position:sticky for pinned columns below, which must track BoardShell's real
                  horizontally-scrolling ancestor. Corner rounding is applied directly to the
                  header row's own background/border instead (works without clipping).
                */}
                {/* Column header row */}
                <div
                  className="flex items-stretch rounded-t-[7px] border-t border-shell-border bg-shell-panel-alt text-[12.5px] font-semibold text-shell-text-muted"
                  style={{ borderLeft: `4px solid ${group.accent_color}` }}
                >
                  <div
                    className="flex flex-none items-center justify-center rounded-tl-[7px] border-r border-shell-border py-[11px]"
                    style={{
                      width: CHECKBOX_WIDTH,
                      ...checkboxPinStyle,
                      ...(checkboxPinStyle ? { background: HEADER_STICKY_BG } : {}),
                    }}
                  >
                    <BoardCheckbox borderColor="var(--color-shell-border-strong)" />
                  </div>
                  {columns.map((column) => (
                    <ColumnCell
                      key={column.id}
                      column={column}
                      isHeader
                      pinStyle={getColumnPinStyle(column, HEADER_STICKY_BG)}
                    >
                      <span className="truncate py-[11px]">{column.label}</span>
                    </ColumnCell>
                  ))}
                </div>

                {/* Empty state */}
                {is_empty && (
                  <div
                    onClick={onAddItem ? (event) => onAddItem(group.id, event) : undefined}
                    className={`flex items-center border-t border-shell-border bg-shell-bg ${
                      onAddItem ? "cursor-pointer hover:bg-shell-panel-alt" : ""
                    }`}
                    style={{ borderLeft: `4px solid ${group.accent_color}`, height: row_height_px }}
                  >
                    <div
                      className="flex flex-none items-center justify-center"
                      style={{ width: CHECKBOX_WIDTH }}
                    >
                      <BoardCheckbox borderColor="var(--color-shell-border)" />
                    </div>
                    <div className="px-3 text-[13px] text-shell-text-faint">+ Add item</div>
                  </div>
                )}

                {/* Rows */}
                {group.rows.map((row) => {
                  const row_id = getRowId(row);
                  const is_selected = selectedRowId === row_id;
                  const row_background = rowColors[row_id] ?? (is_selected ? SELECTED_ROW_BG : undefined);
                  const row_cell_colors = cellColors[row_id];
                  return (
                    <div
                      key={row_id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`flex items-stretch border-t border-shell-border transition-colors ${
                        row_background ? "" : "bg-shell-bg hover:bg-shell-panel-alt"
                      } ${onRowClick ? "cursor-pointer" : ""}`}
                      style={{
                        borderLeft: `4px solid ${group.accent_color}`,
                        ...(row_background ? { background: row_background } : {}),
                      }}
                    >
                      <div
                        className="flex flex-none items-center justify-center border-r border-shell-border"
                        style={{
                          width: CHECKBOX_WIDTH,
                          ...checkboxPinStyle,
                          ...(checkboxPinStyle ? { background: row_background ?? ROW_STICKY_BG } : {}),
                        }}
                      >
                        <BoardCheckbox checked={is_selected} />
                      </div>
                      {columns.map((column) => {
                        const cell_background = row_cell_colors?.[column.id];
                        const pin_style = getColumnPinStyle(
                          column,
                          cell_background ?? row_background ?? ROW_STICKY_BG
                        );
                        return (
                          <div
                            key={column.id}
                            className={`flex flex-none items-center border-r border-shell-border ${
                              column.align === "center" ? "justify-center" : "justify-start"
                            } ${column.bleed ? "" : "px-3"}`}
                            style={{
                              width: column.width,
                              height: row_height_px,
                              ...(!column.bleed && !pin_style && cell_background
                                ? { background: cell_background }
                                : {}),
                              ...pin_style,
                            }}
                          >
                            {renderCell(row, column)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Add-item footer */}
                {!is_empty && (
                  <div
                    onClick={onAddItem ? (event) => onAddItem(group.id, event) : undefined}
                    className={`flex h-10 items-center border-t border-shell-border bg-shell-bg ${
                      onAddItem ? "cursor-pointer hover:bg-shell-panel-alt" : ""
                    }`}
                    style={{ borderLeft: `4px solid ${group.accent_color}` }}
                  >
                    <div
                      className="flex flex-none items-center justify-center"
                      style={{ width: CHECKBOX_WIDTH }}
                    >
                      <BoardCheckbox borderColor="var(--color-shell-border)" />
                    </div>
                    <div className="px-3 text-[13px] text-shell-text-faint">+ Add item</div>
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
