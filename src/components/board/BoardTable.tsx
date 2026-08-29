"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
import InlineTitleEditor from "./InlineTitleEditor";
import AddColumnMenu from "./AddColumnMenu";
import { BOARD_ROW_HEIGHT_PX, type BoardColumn, type BoardTableProps } from "./types";

/** Width of the trailing "+" add-column header cell. */
const ADD_COLUMN_WIDTH = 48;

/** Left-most checkbox column width (kept out of the column config). */
const CHECKBOX_WIDTH = 44;

/** Row backgrounds pinned cells must paint explicitly so they stay opaque over columns scrolling underneath. */
const HEADER_STICKY_BG = "var(--color-shell-panel-alt)";
const ROW_STICKY_BG = "var(--color-shell-bg)";
const STICKY_BOX_SHADOW = "1px 0 0 var(--color-shell-border-strong)";
/** Background of the row whose detail drawer is open — a green-tinted mix over the row surface, reactive to the active theme. */
const SELECTED_ROW_BG = "color-mix(in srgb, var(--color-shell-panel-alt) 78%, var(--color-success-500) 22%)";
/** Background of a row checked for the selection action bar — a blue-tinted mix matching the checkbox's own accent, reactive to the active theme. Takes priority over {@link SELECTED_ROW_BG} when both apply. */
const CHECKBOX_SELECTED_ROW_BG = "color-mix(in srgb, var(--color-shell-panel-alt) 84%, #0073ea 16%)";

const BoardCheckbox: React.FC<{ borderColor?: string; checked?: boolean; partial?: boolean; onClick?: (event: React.MouseEvent) => void }> = ({
  borderColor = "var(--color-shell-border-strong)",
  checked,
  partial,
  onClick,
}) => (
  <span
    onClick={onClick}
    className="flex h-[15px] w-[15px] flex-none cursor-pointer items-center justify-center rounded"
    style={checked || partial ? { background: "#0073ea" } : { border: `1.5px solid ${borderColor}` }}
  >
    {checked && <CheckIcon size={10} className="text-white" />}
    {partial && !checked && <span className="h-[2px] w-[7px] rounded-full bg-white" />}
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

/** Width, in px, of the tree-guide slot: the curved branch connecting a subitem row to the trunk line above it. */
const TREE_INDENT_PX = 26;
/** Corner radius, in px, of that rounded branch. */
const TREE_CURVE_RADIUS = 9;
/** Height, in px, of the subitem panel's own mini column-header row. */
const SUBITEM_HEADER_HEIGHT = 30;

type TreeGuidesProps = {
  /** Whether this row is the last subitem among its siblings; a last row's branch stops at the curve instead of continuing down to the next row. */
  is_last: boolean;
  line_color: string;
  row_height: number;
};

/**
 * Draws the connector to the left of a subitem row: a smoothly rounded
 * branch (an SVG path, not a sharp right angle) off the trunk line running
 * down from the parent item, continuing on to the next subitem unless this
 * is the last one. Mirrors Monday's own subitem connectors, so a subitem's
 * place in the hierarchy reads at a glance instead of only being implied by
 * indentation. Subitems are exactly one level deep (they can't have their
 * own subitems), so this never needs to account for further nesting.
 */
const TreeGuides: React.FC<TreeGuidesProps> = ({ is_last, line_color, row_height }) => {
  const cx = TREE_INDENT_PX / 2;
  const mid_y = row_height / 2;
  const branch_path = `M ${cx} 0 L ${cx} ${mid_y - TREE_CURVE_RADIUS} Q ${cx} ${mid_y} ${cx + TREE_CURVE_RADIUS} ${mid_y} L ${TREE_INDENT_PX} ${mid_y}`;
  return (
    <div className="relative flex-none" style={{ width: TREE_INDENT_PX, height: row_height }} aria-hidden="true">
      <svg width={TREE_INDENT_PX} height={row_height} className="absolute inset-0 overflow-visible">
        <path d={branch_path} fill="none" stroke={line_color} strokeWidth={1.5} strokeLinecap="round" />
        {!is_last && <line x1={cx} y1={mid_y} x2={cx} y2={row_height} stroke={line_color} strokeWidth={1.5} />}
      </svg>
    </div>
  );
};

type AddItemInputRowProps = {
  accent_color: string;
  height: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  /** Tree connector rendered right after the checkbox gutter, when this input stands in for a subitem row rather than a top-level item. */
  tree_guides?: React.ReactNode;
};

/**
 * Replaces the static "+ Add item" footer text with a real text input, in
 * place, when a group is actively adding a row — no popover/dialog. Enter
 * submits a non-empty name; Escape or blurring an empty input cancels.
 */
const AddItemInputRow: React.FC<AddItemInputRowProps> = ({ accent_color, height, onSubmit, onCancel, tree_guides }) => {
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
      {tree_guides}
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
  selectedRowIds,
  onToggleRowSelection,
  onToggleGroupSelection,
  onAddItem,
  addingItemGroupId = null,
  onSubmitNewItem,
  onCancelAddItem,
  onRenameGroup,
  onRenameColumn,
  onAddGroup,
  onAddColumn,
  getChildren,
  getSubitemCount,
  treeColumnId,
  onAddSubitem,
  addingSubitemParentId = null,
  onSubmitNewSubitem,
  onCancelAddSubitem,
  subitemColumns = [],
  onAddSubitemColumn,
}: BoardTableProps<TRow>) {
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [expanded_row_ids, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [editing_group_id, setEditingGroupId] = useState<string | null>(null);
  const [editing_column_id, setEditingColumnId] = useState<string | null>(null);
  const [add_column_anchor, setAddColumnAnchor] = useState<HTMLElement | null>(null);
  const [add_subitem_column_anchor, setAddSubitemColumnAnchor] = useState<HTMLElement | null>(null);
  const row_height_px = BOARD_ROW_HEIGHT_PX[rowHeight];
  const has_pinned_columns = pinnedColumnIds.length > 0;
  const tree_column_id = treeColumnId ?? columns[0]?.id;
  /** The subitem panel's own tree/name column — always its first column, mirroring how {@link tree_column_id} defaults for the parent table. */
  const subitem_tree_column_id = subitemColumns[0]?.id;

  const toggleRow = (row_id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [row_id]: !prev[row_id] }));
  };

  const openAddSubitem = (row_id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [row_id]: true }));
    onAddSubitem?.(row_id);
  };

  /**
   * The table's real content width: the checkbox gutter, every column's fixed
   * width, and the trailing "+" add-column cell. Driving the container off this
   * (instead of a static `minWidth`) is what lets the table grow as columns are
   * added — otherwise the root stays viewport-wide, rows only stretch that far,
   * and the fixed-width cells that overflow paint past the row's own background,
   * so the table looks "cut off" when scrolled right. A `minWidth: 100%` floor
   * still fills the viewport when the columns don't add up to a full screen.
   */
  const content_width = useMemo(() => {
    const columns_width = columns.reduce((sum, column) => sum + column.width, 0);
    return CHECKBOX_WIDTH + columns_width + (onAddColumn ? ADD_COLUMN_WIDTH : 0);
  }, [columns, onAddColumn]);

  const table_width = Math.max(content_width, minWidth);

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
    <div className="flex flex-col gap-[34px]" style={{ width: table_width, minWidth: "100%" }}>
      {groups.map((group) => {
        const is_expanded = !collapsed_group_ids[group.id];
        const is_empty = group.rows.length === 0;
        const selected_row_count = selectedRowIds
          ? group.rows.filter((row) => selectedRowIds.has(getRowId(row))).length
          : 0;
        const is_group_fully_selected = !is_empty && selected_row_count === group.rows.length;
        const is_group_partially_selected = selected_row_count > 0 && !is_group_fully_selected;
        const tree_line_color = `color-mix(in srgb, ${group.accent_color} 55%, var(--color-shell-border-strong))`;

        /**
         * Renders one subitem row using {@link subitemColumns} — a separate
         * column set from the parent table's own {@link columns}, mirroring
         * monday.com's subitems living on an implicit separate sub-board.
         * Subitems are exactly one level deep, so unlike the parent row
         * renderer below, this never recurses.
         */
        const renderSubitemRow = (row: TRow, is_last: boolean): React.ReactNode => {
          const row_id = getRowId(row);
          const is_drawer_open = selectedRowId === row_id;
          const row_background = rowColors[row_id] ?? (is_drawer_open ? SELECTED_ROW_BG : undefined);
          const row_cell_colors = cellColors[row_id];

          return (
            <div
              key={row_id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`flex items-stretch border-t border-shell-border transition-colors ${
                row_background ? "" : "bg-shell-bg hover:bg-shell-panel-alt"
              } ${onRowClick ? "cursor-pointer" : ""}`}
              style={{
                borderLeft: `3px solid ${group.accent_color}`,
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
                <BoardCheckbox />
              </div>
              {subitemColumns.map((column) => {
                const cell_background = row_cell_colors?.[column.id];
                const is_tree_column = column.id === subitem_tree_column_id;
                return (
                  <div
                    key={column.id}
                    className={`flex flex-none items-center border-r border-shell-border ${
                      column.align === "center" ? "justify-center" : "justify-start"
                    } ${column.bleed ? "" : "px-3"}`}
                    style={{
                      width: column.width,
                      height: row_height_px,
                      ...(!column.bleed && cell_background ? { background: cell_background } : {}),
                    }}
                  >
                    {is_tree_column ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <TreeGuides is_last={is_last} line_color={tree_line_color} row_height={row_height_px} />
                        <div className="min-w-0 flex-1 truncate">{renderCell(row, column)}</div>
                      </div>
                    ) : (
                      renderCell(row, column)
                    )}
                  </div>
                );
              })}
            </div>
          );
        };

        /**
         * Wraps a row's direct subitems in their own mini-table: a column
         * header specific to {@link subitemColumns} (with its own "+" to add
         * a subitem-scoped column), the subitem rows themselves, and the
         * "+ Add subitem" footer. No card border or background tint — a flat
         * continuation of the group, distinguished only by indentation, the
         * curved connector, and its own header cap, matching monday.com's
         * own subitem panel.
         */
        const renderSubitemsPanel = (parent_row_id: string, children: TRow[]): React.ReactNode => {
          const has_footer = Boolean(onAddSubitem);
          const is_adding = addingSubitemParentId === parent_row_id;

          return (
            <div>
              <div
                className="flex items-stretch border-t border-shell-border bg-shell-panel-alt"
                style={{ borderLeft: `3px solid ${group.accent_color}`, height: SUBITEM_HEADER_HEIGHT }}
              >
                <div
                  className="flex flex-none items-center justify-center border-r border-shell-border"
                  style={{
                    width: CHECKBOX_WIDTH,
                    ...checkboxPinStyle,
                    ...(checkboxPinStyle ? { background: HEADER_STICKY_BG } : {}),
                  }}
                />
                {subitemColumns.map((column) => {
                  const is_renamable = Boolean(onRenameColumn) && column.renamable !== false;
                  // Keyed by group *and* column, same as the parent header, so
                  // clicking one panel's copy of a header doesn't also open
                  // every other group's copy of the same (board-wide) column.
                  const editing_key = `subitem::${group.id}::${column.id}`;
                  return (
                    <div
                      key={column.id}
                      className={`flex flex-none items-center border-r border-shell-border ${column.bleed ? "" : "px-3"}`}
                      style={{ width: column.width }}
                    >
                      {is_renamable && editing_column_id === editing_key ? (
                        <InlineTitleEditor
                          value={column.label}
                          onCommit={(label) => {
                            onRenameColumn?.(column.id, label);
                            setEditingColumnId(null);
                          }}
                          onCancel={() => setEditingColumnId(null)}
                          className="w-full min-w-0 text-[11px] font-semibold text-shell-text"
                          aria_label="Rename column"
                        />
                      ) : (
                        <span
                          onClick={
                            is_renamable
                              ? (event) => {
                                  event.stopPropagation();
                                  setEditingColumnId(editing_key);
                                }
                              : undefined
                          }
                          className={`truncate text-[11px] font-semibold text-shell-text-muted ${
                            is_renamable ? "cursor-pointer rounded-[4px] hover:text-shell-text" : ""
                          }`}
                          title={is_renamable ? "Rename column" : undefined}
                        >
                          {column.label}
                        </span>
                      )}
                    </div>
                  );
                })}
                {onAddSubitemColumn && (
                  <div
                    className="flex flex-none items-center justify-center border-r border-shell-border"
                    style={{ width: ADD_COLUMN_WIDTH }}
                  >
                    <button
                      type="button"
                      onClick={(event) => setAddSubitemColumnAnchor(event.currentTarget)}
                      aria-label="Add subitem column"
                      title="Add column"
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
                    >
                      <PlusIcon size={13} />
                    </button>
                  </div>
                )}
              </div>

              {children.map((child, index) => renderSubitemRow(child, index === children.length - 1))}

              {has_footer &&
                (is_adding ? (
                  <AddItemInputRow
                    accent_color={group.accent_color}
                    height={row_height_px}
                    onSubmit={(name) => onSubmitNewSubitem?.(parent_row_id, name)}
                    onCancel={() => onCancelAddSubitem?.()}
                    tree_guides={<TreeGuides is_last line_color={tree_line_color} row_height={row_height_px} />}
                  />
                ) : (
                  <div
                    onClick={() => openAddSubitem(parent_row_id)}
                    className="flex cursor-pointer items-center border-t border-shell-border bg-shell-bg hover:bg-shell-panel-alt"
                    style={{ borderLeft: `3px solid ${group.accent_color}`, height: row_height_px }}
                  >
                    <div className="flex flex-none items-center justify-center" style={{ width: CHECKBOX_WIDTH }} />
                    <TreeGuides is_last line_color={tree_line_color} row_height={row_height_px} />
                    <div className="pl-3 text-[13px] text-shell-text-faint">+ Add subitem</div>
                  </div>
                ))}
            </div>
          );
        };

        /**
         * Renders one root item row, then (when expanded) its subitems panel
         * below it. A row's checkbox gutter opens the drawer's own selection;
         * subitems are never part of this same bulk-selection scope, which
         * mirrors the backend only ever cascading Duplicate/Move/Archive/
         * Delete from a root.
         */
        const renderRow = (row: TRow): React.ReactNode => {
          const row_id = getRowId(row);
          const is_drawer_open = selectedRowId === row_id;
          const is_checkbox_selected = selectedRowIds?.has(row_id) ?? false;
          const row_background =
            rowColors[row_id] ??
            (is_checkbox_selected ? CHECKBOX_SELECTED_ROW_BG : is_drawer_open ? SELECTED_ROW_BG : undefined);
          const row_cell_colors = cellColors[row_id];
          const children = getChildren?.(row);
          const subitem_count = getSubitemCount?.(row) ?? children?.length ?? 0;
          const has_toggle = subitem_count > 0 || Boolean(children?.length);
          const is_row_expanded = expanded_row_ids[row_id] ?? false;

          return (
            <React.Fragment key={row_id}>
              <div
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group/row flex items-stretch border-t border-shell-border transition-colors ${
                  row_background ? "" : "bg-shell-bg hover:bg-shell-panel-alt"
                } ${onRowClick ? "cursor-pointer" : ""}`}
                style={{
                  borderLeft: `4px solid ${group.accent_color}`,
                  ...(row_background ? { background: row_background } : {}),
                }}
              >
                {/* The checkbox gutter never opens the row's detail drawer, unlike the rest of the row — it stops the click here before it can bubble up to the row's own onClick above. */}
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="flex flex-none items-center justify-center border-r border-shell-border"
                  style={{
                    width: CHECKBOX_WIDTH,
                    ...checkboxPinStyle,
                    ...(checkboxPinStyle ? { background: row_background ?? ROW_STICKY_BG } : {}),
                  }}
                >
                  <BoardCheckbox
                    checked={is_checkbox_selected}
                    onClick={onToggleRowSelection ? () => onToggleRowSelection(row_id) : undefined}
                  />
                </div>
                {columns.map((column) => {
                  const cell_background = row_cell_colors?.[column.id];
                  const pin_style = getColumnPinStyle(
                    column,
                    cell_background ?? row_background ?? ROW_STICKY_BG
                  );
                  const is_tree_column = column.id === tree_column_id;
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
                      {is_tree_column ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          {has_toggle && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRow(row_id);
                              }}
                              className="flex h-4 w-4 flex-none items-center justify-center rounded text-shell-text-muted transition-transform duration-150 hover:bg-shell-hover"
                              style={{ transform: is_row_expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                              aria-label={is_row_expanded ? "Collapse subitems" : "Expand subitems"}
                            >
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M3 4.5 L6 7.5 L9 4.5"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          )}
                          <div className="min-w-0 flex-1 truncate">{renderCell(row, column)}</div>
                          {!is_row_expanded && subitem_count > 0 && (
                            <span className="flex-none rounded-full bg-shell-panel-alt px-1.5 py-[1px] text-[11px] font-medium text-shell-text-muted">
                              {subitem_count} Subitem{subitem_count === 1 ? "" : "s"}
                            </span>
                          )}
                          {onAddSubitem && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAddSubitem(row_id);
                              }}
                              className="flex h-4 w-4 flex-none items-center justify-center rounded text-shell-text-muted opacity-0 transition-opacity hover:bg-shell-hover group-hover/row:opacity-100"
                              aria-label="Add subitem"
                              title="Add subitem"
                            >
                              <PlusIcon size={11} />
                            </button>
                          )}
                        </div>
                      ) : (
                        renderCell(row, column)
                      )}
                    </div>
                  );
                })}
              </div>
              {is_row_expanded &&
                (children?.length || onAddSubitem) &&
                renderSubitemsPanel(row_id, children ?? [])}
            </React.Fragment>
          );
        };

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
                <InlineTitleEditor
                  value={group.name}
                  onCommit={(name) => {
                    onRenameGroup?.(group.id, name);
                    setEditingGroupId(null);
                  }}
                  onCancel={() => setEditingGroupId(null)}
                  className="text-base font-bold tracking-[-0.01em]"
                  style={{ color: group.accent_color, maxWidth: 320 }}
                  aria_label="Rename table"
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
                    <BoardCheckbox
                      borderColor="var(--color-shell-border-strong)"
                      checked={is_group_fully_selected}
                      partial={is_group_partially_selected}
                      onClick={
                        onToggleGroupSelection
                          ? (event) => {
                              event.stopPropagation();
                              onToggleGroupSelection(group.id);
                            }
                          : undefined
                      }
                    />
                  </div>
                  {columns.map((column) => {
                    const is_renamable = Boolean(onRenameColumn) && column.renamable !== false;
                    // Columns are board-wide, so the same header repeats once per group.
                    // Key the open editor by group *and* column so clicking a header only
                    // turns that one cell into an input, not every group's copy of it.
                    const editing_key = `${group.id}::${column.id}`;
                    return (
                      <ColumnCell
                        key={column.id}
                        column={column}
                        isHeader
                        pinStyle={getColumnPinStyle(column, HEADER_STICKY_BG)}
                      >
                        {is_renamable && editing_column_id === editing_key ? (
                          <InlineTitleEditor
                            value={column.label}
                            onCommit={(label) => {
                              onRenameColumn?.(column.id, label);
                              setEditingColumnId(null);
                            }}
                            onCancel={() => setEditingColumnId(null)}
                            className="w-full min-w-0 text-[12.5px] font-semibold text-shell-text"
                            aria_label="Rename column"
                          />
                        ) : (
                          <span
                            onClick={
                              is_renamable
                                ? (event) => {
                                    event.stopPropagation();
                                    setEditingColumnId(editing_key);
                                  }
                                : undefined
                            }
                            className={`truncate py-[11px] ${
                              is_renamable ? "cursor-pointer rounded-[4px] hover:text-shell-text" : ""
                            }`}
                            title={is_renamable ? "Rename column" : undefined}
                          >
                            {column.label}
                          </span>
                        )}
                      </ColumnCell>
                    );
                  })}
                  {onAddColumn && (
                    <div
                      className="flex flex-none items-center justify-center border-r border-shell-border"
                      style={{ width: ADD_COLUMN_WIDTH }}
                    >
                      <button
                        type="button"
                        onClick={(event) => setAddColumnAnchor(event.currentTarget)}
                        aria-label="Add column"
                        title="Add column"
                        className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
                      >
                        <PlusIcon size={15} />
                      </button>
                    </div>
                  )}
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
                {group.rows.map((row) => renderRow(row))}

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

      {onAddColumn && (
        <AddColumnMenu
          anchor_el={add_column_anchor}
          is_open={add_column_anchor !== null}
          onClose={() => setAddColumnAnchor(null)}
          onSelectType={(type) => onAddColumn(type)}
        />
      )}

      {onAddSubitemColumn && (
        <AddColumnMenu
          anchor_el={add_subitem_column_anchor}
          is_open={add_subitem_column_anchor !== null}
          onClose={() => setAddSubitemColumnAnchor(null)}
          onSelectType={(type) => onAddSubitemColumn(type)}
        />
      )}
    </div>
  );
}

export default BoardTable;
