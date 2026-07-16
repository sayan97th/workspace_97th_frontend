"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
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

type AddItemInputRowProps = {
  accent_color: string;
  height: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

/**
 * Replaces the static "+ Add item" footer text with a real text input, in
 * place, when a group is actively adding a row — no popover/dialog. Enter
 * submits a non-empty name; Escape or blurring an empty input cancels.
 */
const AddItemInputRow: React.FC<AddItemInputRowProps> = ({ accent_color, height, onSubmit, onCancel }) => {
  const [value, setValue] = useState("");
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input_ref.current?.focus();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div
      className="flex items-center border-t border-shell-border bg-shell-panel-alt"
      style={{ borderLeft: `4px solid ${accent_color}`, height }}
    >
      <div className="flex flex-none items-center justify-center" style={{ width: CHECKBOX_WIDTH }}>
        <BoardCheckbox borderColor="var(--color-shell-border)" />
      </div>
      <input
        ref={input_ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        onBlur={commit}
        placeholder="Item name"
        className="mx-3 flex-1 rounded-[6px] border border-brand-500 bg-shell-bg px-2 py-1 text-[13px] text-shell-text outline-none"
        style={{ maxWidth: 280 }}
      />
    </div>
  );
};

type GroupTitleEditorProps = {
  value: string;
  accent_color: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
};

/**
 * Replaces a group's static title with a real text input, in place, while
 * it's being renamed — same commit/cancel contract as `AddItemInputRow`.
 * Enter or blur with a non-empty, changed value commits; Escape or blurring
 * back to the original/empty value cancels without calling `onCommit`.
 */
const GroupTitleEditor: React.FC<GroupTitleEditorProps> = ({ value, accent_color, onCommit, onCancel }) => {
  const [draft_name, setDraftName] = useState(value);
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input_ref.current?.focus();
    input_ref.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft_name.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={input_ref}
      value={draft_name}
      onChange={(event) => setDraftName(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
      className="rounded-[6px] border border-brand-500 bg-shell-bg px-2 py-1 text-base font-bold tracking-[-0.01em] outline-none"
      style={{ color: accent_color, maxWidth: 320 }}
    />
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
  addingItemGroupId = null,
  onSubmitNewItem,
  onCancelAddItem,
  onRenameGroup,
  onAddGroup,
}: BoardTableProps<TRow>) {
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [editing_group_id, setEditingGroupId] = useState<string | null>(null);
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
              {editing_group_id === group.id ? (
                <GroupTitleEditor
                  value={group.name}
                  accent_color={group.accent_color}
                  onCommit={(name) => {
                    onRenameGroup?.(group.id, name);
                    setEditingGroupId(null);
                  }}
                  onCancel={() => setEditingGroupId(null)}
                />
              ) : (
                <span
                  onClick={onRenameGroup ? () => setEditingGroupId(group.id) : undefined}
                  className={`rounded-[6px] border border-transparent px-2 py-1 text-base font-bold tracking-[-0.01em] ${
                    onRenameGroup ? "cursor-pointer hover:border-shell-border hover:bg-shell-hover" : ""
                  }`}
                  style={{ color: group.accent_color }}
                >
                  {group.name}
                </span>
              )}
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
                {is_empty &&
                  (addingItemGroupId === group.id ? (
                    <AddItemInputRow
                      accent_color={group.accent_color}
                      height={row_height_px}
                      onSubmit={(name) => onSubmitNewItem?.(group.id, name)}
                      onCancel={() => onCancelAddItem?.()}
                    />
                  ) : (
                    <div
                      onClick={onAddItem ? () => onAddItem(group.id) : undefined}
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
                  ))}

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
                {!is_empty &&
                  (addingItemGroupId === group.id ? (
                    <AddItemInputRow
                      accent_color={group.accent_color}
                      height={40}
                      onSubmit={(name) => onSubmitNewItem?.(group.id, name)}
                      onCancel={() => onCancelAddItem?.()}
                    />
                  ) : (
                    <div
                      onClick={onAddItem ? () => onAddItem(group.id) : undefined}
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
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {onAddGroup && (
        <button
          type="button"
          onClick={onAddGroup}
          className="flex w-fit items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        >
          <PlusIcon size={13} />
          Add new group
        </button>
      )}
    </div>
  );
}

export default BoardTable;
