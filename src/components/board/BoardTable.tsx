"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
import { boardTreeFontClassName } from "./board-tree-font";
import InlineTitleEditor from "./InlineTitleEditor";
import AddColumnMenu from "./AddColumnMenu";
import { BOARD_ROW_HEIGHT_PX, type BoardColumn, type BoardTableProps } from "./types";

/** Width of the trailing "+" add-column header cell. */
const ADD_COLUMN_WIDTH = 48;

/**
 * Forces every inline rename input's border/background to the boardtree
 * palette via inline style (which always wins over `InlineTitleEditor`'s own
 * `border-brand-500 bg-shell-bg` base classes, regardless of Tailwind's
 * generated rule order) — that shared component is also used outside the
 * board table (Kanban, view tabs), so its own default styling stays as-is
 * and this override lives only at the call sites here.
 */
const INLINE_EDITOR_STYLE: React.CSSProperties = {
  borderColor: "var(--color-boardtree-accent)",
  background: "var(--color-boardtree-surface)",
};

/** Left-most checkbox column width (kept out of the column config) — matches the design's 36px checkbox gutter. */
const CHECKBOX_WIDTH = 36;

/** Row backgrounds pinned cells must paint explicitly so they stay opaque over columns scrolling underneath. */
const HEADER_STICKY_BG = "var(--color-boardtree-panel-alt)";
const ROW_STICKY_BG = "var(--color-boardtree-surface)";
const STICKY_BOX_SHADOW = "1px 0 0 var(--color-boardtree-border)";
/** Background of the row whose detail drawer is open — a faint accent-tinted mix over the row surface. */
const SELECTED_ROW_BG = "color-mix(in srgb, var(--color-boardtree-surface) 85%, var(--color-boardtree-accent) 15%)";
/** Background of a row checked for the selection action bar — matches the design's `#eaf0ff` selected-row tint exactly (light) / its dark counterpart. Takes priority over {@link SELECTED_ROW_BG} when both apply. */
const CHECKBOX_SELECTED_ROW_BG = "var(--color-boardtree-selected)";

const BoardCheckbox: React.FC<{
  borderColor?: string;
  checked?: boolean;
  partial?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  size?: number;
}> = ({ borderColor = "var(--color-boardtree-border)", checked, partial, onClick, size = 15 }) => (
  <span
    onClick={onClick}
    className="flex flex-none cursor-pointer items-center justify-center rounded-[3px] transition-colors"
    style={{
      width: size,
      height: size,
      ...(checked || partial
        ? { background: "var(--color-boardtree-accent)" }
        : { border: `1.5px solid ${borderColor}`, background: "var(--color-boardtree-surface)" }),
    }}
  >
    {checked && <CheckIcon size={Math.round(size * 0.66)} className="text-white" />}
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
      className={`flex flex-none items-center ${alignment} ${padding} border-r border-boardtree-border-soft`}
      style={{ width: column.width, ...pinStyle }}
    >
      {children}
    </div>
  );
};

/** Width, in px, of the tree-guide slot: the curved branch connecting a subitem row to the trunk line above it. */
const TREE_INDENT_PX = 30;
/** Corner radius, in px, of that rounded branch. */
const TREE_CURVE_RADIUS = 9;
/** Height, in px, of the subitem panel's own mini column-header row. */
const SUBITEM_HEADER_HEIGHT = 34;
/** Height, in px, of a subitem row — slightly shorter than a root row, mirroring the design. */
const SUBITEM_ROW_HEIGHT_DELTA = 2;

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
 * is the last one. Mirrors the design's own subitem connectors, so a
 * subitem's place in the hierarchy reads at a glance instead of only being
 * implied by indentation. Subitems are exactly one level deep (they can't
 * have their own subitems), so this never needs to account for further
 * nesting.
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
      className="flex items-center border-t border-boardtree-border-soft bg-boardtree-surface"
      style={{ borderLeft: `4px solid ${accent_color}`, height }}
    >
      <div className="flex flex-none items-center justify-center" style={{ width: CHECKBOX_WIDTH }}>
        <BoardCheckbox borderColor="var(--color-boardtree-border)" />
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
        className="mx-3 flex-1 rounded-[6px] border-2 border-boardtree-accent bg-boardtree-surface px-2 py-1 text-[13px] text-boardtree-text outline-none"
        style={{ maxWidth: 280 }}
      />
    </div>
  );
};

/**
 * Generic, reusable Monday-style board table, skinned to match the
 * client-approved "Table board tree subitems" design (see
 * `design/desing_3/Table_board_tree_subitems.dc.html`). It owns group
 * collapse state and the fixed-column layout; callers supply the columns,
 * grouped rows and a `renderCell` function, so any future board view can
 * reuse this shell. The design's own blue/IBM-Plex identity is scoped to
 * this component via `boardTreeFontClassName` and the `--color-boardtree-*`
 * tokens (see `globals.css`) rather than the app's shared shell tokens, so
 * it doesn't bleed into the rest of the app.
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
  const subitem_row_height_px = Math.max(28, row_height_px - SUBITEM_ROW_HEIGHT_DELTA);
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

  /** Sticky style for a data column cell, or undefined when it isn't pinned. Bleed columns (Status/Priority) skip the background so their own full-bleed colour keeps showing. */
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
    <div
      className={`${boardTreeFontClassName} flex flex-col gap-[30px]`}
      style={{ width: table_width, minWidth: "100%" }}
    >
      {groups.map((group) => {
        const is_expanded = !collapsed_group_ids[group.id];
        const is_empty = group.rows.length === 0;
        const selected_row_count = selectedRowIds
          ? group.rows.filter((row) => selectedRowIds.has(getRowId(row))).length
          : 0;
        const is_group_fully_selected = !is_empty && selected_row_count === group.rows.length;
        const is_group_partially_selected = selected_row_count > 0 && !is_group_fully_selected;
        const tree_line_color = `color-mix(in srgb, ${group.accent_color} 60%, var(--color-boardtree-accent-soft))`;
        const total_subitem_count = getChildren || getSubitemCount
          ? group.rows.reduce((sum, row) => sum + (getSubitemCount?.(row) ?? getChildren?.(row)?.length ?? 0), 0)
          : null;

        /**
         * Renders one subitem row using {@link subitemColumns} — a separate
         * column set from the parent table's own {@link columns}, mirroring
         * the design's subitems living on an implicit separate sub-board.
         * Subitems are exactly one level deep, so unlike the parent row
         * renderer below, this never recurses.
         */
        const renderSubitemRow = (row: TRow, is_last: boolean): React.ReactNode => {
          const row_id = getRowId(row);
          const is_drawer_open = selectedRowId === row_id;
          const is_checkbox_selected = selectedRowIds?.has(row_id) ?? false;
          const row_background =
            rowColors[row_id] ??
            (is_checkbox_selected ? CHECKBOX_SELECTED_ROW_BG : is_drawer_open ? SELECTED_ROW_BG : undefined);
          const row_cell_colors = cellColors[row_id];

          return (
            <div
              key={row_id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`flex items-stretch border-t border-boardtree-border-soft transition-colors ${
                row_background ? "" : "bg-boardtree-surface hover:bg-boardtree-hover"
              } ${onRowClick ? "cursor-pointer" : ""}`}
              style={{
                borderLeft: `3px solid ${group.accent_color}`,
                height: subitem_row_height_px,
                ...(row_background ? { background: row_background } : {}),
              }}
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="flex flex-none items-center justify-center border-r border-boardtree-border-soft"
                style={{
                  width: CHECKBOX_WIDTH,
                  ...checkboxPinStyle,
                  ...(checkboxPinStyle ? { background: row_background ?? ROW_STICKY_BG } : {}),
                }}
              >
                <BoardCheckbox
                  size={14}
                  checked={is_checkbox_selected}
                  onClick={onToggleRowSelection ? () => onToggleRowSelection(row_id) : undefined}
                />
              </div>
              {subitemColumns.map((column) => {
                const cell_background = row_cell_colors?.[column.id];
                const is_tree_column = column.id === subitem_tree_column_id;
                return (
                  <div
                    key={column.id}
                    className={`flex flex-none items-center border-r border-boardtree-border-soft ${
                      column.align === "center" ? "justify-center" : "justify-start"
                    } ${column.bleed ? "" : "px-3"}`}
                    style={{
                      width: column.width,
                      height: subitem_row_height_px,
                      ...(!column.bleed && cell_background ? { background: cell_background } : {}),
                    }}
                  >
                    {is_tree_column ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <TreeGuides is_last={is_last} line_color={tree_line_color} row_height={subitem_row_height_px} />
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
         * curved connector, and its own header cap, matching the design's
         * own subitem panel.
         */
        const renderSubitemsPanel = (parent_row_id: string, children: TRow[]): React.ReactNode => {
          const has_footer = Boolean(onAddSubitem);
          const is_adding = addingSubitemParentId === parent_row_id;

          return (
            <div>
              <div
                className="flex items-stretch border-t border-boardtree-border bg-boardtree-panel-alt"
                style={{ borderLeft: `3px solid ${group.accent_color}`, height: SUBITEM_HEADER_HEIGHT }}
              >
                <div
                  className="flex flex-none items-center justify-center border-r border-boardtree-border-soft"
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
                      className={`flex flex-none items-center border-r border-boardtree-border-soft ${column.bleed ? "" : "px-3"}`}
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
                          className="w-full min-w-0 text-[11px] font-semibold text-boardtree-text"
                          style={INLINE_EDITOR_STYLE}
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
                          className={`truncate text-[11px] font-semibold text-boardtree-text-muted ${
                            is_renamable ? "cursor-pointer rounded-[4px] hover:text-boardtree-text" : ""
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
                    className="flex flex-none items-center justify-center border-r border-boardtree-border-soft"
                    style={{ width: ADD_COLUMN_WIDTH }}
                  >
                    <button
                      type="button"
                      onClick={(event) => setAddSubitemColumnAnchor(event.currentTarget)}
                      aria-label="Add subitem column"
                      title="Add column"
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-boardtree-text-muted transition-colors hover:bg-boardtree-hover hover:text-boardtree-text"
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
                    height={subitem_row_height_px}
                    onSubmit={(name) => onSubmitNewSubitem?.(parent_row_id, name)}
                    onCancel={() => onCancelAddSubitem?.()}
                    tree_guides={<TreeGuides is_last line_color={tree_line_color} row_height={subitem_row_height_px} />}
                  />
                ) : (
                  <div
                    onClick={() => openAddSubitem(parent_row_id)}
                    className="flex cursor-pointer items-center border-t border-boardtree-border-soft bg-boardtree-surface hover:bg-boardtree-hover"
                    style={{ borderLeft: `3px solid ${group.accent_color}`, height: subitem_row_height_px }}
                  >
                    <div className="flex flex-none items-center justify-center" style={{ width: CHECKBOX_WIDTH }} />
                    <TreeGuides is_last line_color={tree_line_color} row_height={subitem_row_height_px} />
                    <div className="pl-3 text-[12.5px] text-boardtree-text-faint hover:text-boardtree-accent">
                      + Add subitem
                    </div>
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
                className={`group/row flex items-stretch border-t border-boardtree-border-soft transition-colors ${
                  row_background ? "" : "bg-boardtree-surface hover:bg-boardtree-hover"
                } ${onRowClick ? "cursor-pointer" : ""}`}
                style={{
                  borderLeft: `4px solid ${group.accent_color}`,
                  height: row_height_px,
                  ...(row_background ? { background: row_background } : {}),
                }}
              >
                {/* The checkbox gutter never opens the row's detail drawer, unlike the rest of the row — it stops the click here before it can bubble up to the row's own onClick above. */}
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="flex flex-none items-center justify-center border-r border-boardtree-border-soft"
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
                      className={`flex flex-none items-center border-r border-boardtree-border-soft ${
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
                              className="flex h-5 w-5 flex-none items-center justify-center rounded-[4px] text-boardtree-text-muted transition-colors hover:bg-boardtree-hover hover:text-boardtree-text"
                              aria-label={is_row_expanded ? "Collapse subitems" : "Expand subitems"}
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 12 12"
                                fill="none"
                                style={{ transform: is_row_expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms" }}
                              >
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
                          {has_toggle && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRow(row_id);
                              }}
                              className="flex-none rounded-full bg-boardtree-hover px-1.5 py-[1px] font-boardtree-mono text-[10.5px] font-medium text-boardtree-text-secondary transition-colors hover:bg-boardtree-selected"
                              title={is_row_expanded ? "Collapse subitems" : "Expand subitems"}
                            >
                              {subitem_count}
                            </button>
                          )}
                          {onAddSubitem && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openAddSubitem(row_id);
                              }}
                              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-boardtree-text-faint transition-colors hover:bg-boardtree-hover hover:text-boardtree-accent"
                              aria-label="Add subitem"
                              title="Add subitem"
                            >
                              <PlusIcon size={12} />
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
            <div className="flex items-center gap-2 px-0 pb-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex h-[20px] w-[20px] items-center justify-center rounded-md transition-transform duration-150"
                style={{
                  color: group.accent_color,
                  transform: is_expanded ? "rotate(0deg)" : "rotate(-90deg)",
                }}
                aria-label={`Toggle ${group.name}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5 L6 8 L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
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
                  className="text-[16px] font-semibold tracking-[-0.01em]"
                  style={{ ...INLINE_EDITOR_STYLE, color: group.accent_color, maxWidth: 320 }}
                  aria_label="Rename table"
                />
              ) : (
                <span
                  onClick={onRenameGroup ? () => setEditingGroupId(group.id) : undefined}
                  className={`rounded-[6px] border border-transparent px-2 py-1 text-[16px] font-semibold tracking-[-0.01em] ${
                    onRenameGroup ? "cursor-pointer hover:border-boardtree-border hover:bg-boardtree-hover" : ""
                  }`}
                  style={{ color: group.accent_color }}
                >
                  {group.name}
                </span>
              )}
              <span className="font-boardtree-mono text-[11px] text-boardtree-text-faint">
                {group.rows.length} item{group.rows.length === 1 ? "" : "s"}
                {total_subitem_count !== null ? ` · ${total_subitem_count} subitem${total_subitem_count === 1 ? "" : "s"}` : ""}
              </span>
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
                  className="flex items-stretch rounded-t-[8px] border-t border-boardtree-border bg-boardtree-surface text-[12.5px] font-medium text-boardtree-text-muted"
                  style={{ borderLeft: `4px solid ${group.accent_color}` }}
                >
                  <div
                    className="flex flex-none items-center justify-center rounded-tl-[8px] border-r border-boardtree-border-soft py-[11px]"
                    style={{
                      width: CHECKBOX_WIDTH,
                      ...checkboxPinStyle,
                      ...(checkboxPinStyle ? { background: HEADER_STICKY_BG } : {}),
                    }}
                  >
                    <BoardCheckbox
                      borderColor="var(--color-boardtree-border)"
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
                            className="w-full min-w-0 text-[12.5px] font-medium text-boardtree-text"
                            style={INLINE_EDITOR_STYLE}
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
                              is_renamable ? "cursor-pointer rounded-[4px] hover:text-boardtree-text" : ""
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
                      className="flex flex-none items-center justify-center border-r border-boardtree-border-soft"
                      style={{ width: ADD_COLUMN_WIDTH }}
                    >
                      <button
                        type="button"
                        onClick={(event) => setAddColumnAnchor(event.currentTarget)}
                        aria-label="Add column"
                        title="Add column"
                        className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-boardtree-text-muted transition-colors hover:bg-boardtree-hover hover:text-boardtree-text"
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
                      className={`flex items-center border-t border-boardtree-border-soft bg-boardtree-surface ${
                        onAddItem ? "cursor-pointer hover:bg-boardtree-hover" : ""
                      }`}
                      style={{ borderLeft: `4px solid ${group.accent_color}`, height: row_height_px }}
                    >
                      <div
                        className="flex flex-none items-center justify-center"
                        style={{ width: CHECKBOX_WIDTH }}
                      >
                        <BoardCheckbox borderColor="var(--color-boardtree-border)" />
                      </div>
                      <div className="px-3 text-[13px] text-boardtree-text-faint hover:text-boardtree-accent">
                        + Add item
                      </div>
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
                      className={`flex h-10 items-center rounded-b-[8px] border-t border-boardtree-border-soft bg-boardtree-surface ${
                        onAddItem ? "cursor-pointer hover:bg-boardtree-hover" : ""
                      }`}
                      style={{ borderLeft: `4px solid ${group.accent_color}` }}
                    >
                      <div
                        className="flex flex-none items-center justify-center"
                        style={{ width: CHECKBOX_WIDTH }}
                      >
                        <BoardCheckbox borderColor="var(--color-boardtree-border)" />
                      </div>
                      <div className="px-3 text-[13px] text-boardtree-text-faint hover:text-boardtree-accent">
                        + Add item
                      </div>
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
          className="flex w-fit items-center gap-1.5 rounded-[7px] border border-boardtree-border px-2.5 py-1.5 text-[12.5px] font-medium text-boardtree-text-muted transition-colors hover:bg-boardtree-hover hover:text-boardtree-text"
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
