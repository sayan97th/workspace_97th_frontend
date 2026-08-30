"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, DragHandleIcon, PlusIcon } from "@/icons/board-icons";
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

/** Width, in px, of a root row's (or the subitem panel's own) solid accent-color rail. */
const GROUP_RAIL_WIDTH = 5;

/**
 * A group's colored accent bar — rendered as a flex-none sibling at the
 * start of a row/header/footer instead of a `border-left` on the row itself,
 * mirroring the approved design's own construction (a standalone rail next
 * to the row content, not a border on it). Only the group's own header (top)
 * and its final "+ Add item" footer (bottom) round a corner — every other
 * rail, including every subitem row, is a plain rectangle, matching the
 * design exactly.
 */
const GroupRail: React.FC<{ color: string; rounded?: "tl" | "bl" }> = ({ color, rounded }) => (
  <div
    aria-hidden="true"
    className={`flex-none self-stretch ${rounded === "tl" ? "rounded-tl-[3px]" : rounded === "bl" ? "rounded-bl-[3px]" : ""}`}
    style={{ width: GROUP_RAIL_WIDTH, background: color }}
  />
);

/** A thin insertion-line indicator shown where a dragged row would land on drop. `indent` nudges it past a subitem panel's tree gutter so it doesn't run under the connector. */
const DropInsertionLine: React.FC<{ indent?: number }> = ({ indent = 0 }) => (
  <div aria-hidden="true" style={{ height: 2, marginLeft: indent, background: "var(--color-boardtree-accent)" }} />
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

/** Width, in px, of the rail slot carrying a subitem list's continuous trunk line. */
const TRUNK_SLOT_WIDTH = 5;
/** Thickness, in px, of the trunk line itself, centered within {@link TRUNK_SLOT_WIDTH}. */
const TRUNK_LINE_WIDTH = 1.5;
/** Width, in px, of the curved-branch slot connecting the trunk to a subitem row. Its corner radius (9px, matching the design) is baked into {@link TreeBranch}'s `rounded-bl-[9px]` class directly, since Tailwind's arbitrary-value classes can't reference a JS constant. */
const TREE_INDENT_PX = 30;
/**
 * Fixed height, in px, of a subitem row's curved branch. Every row draws the
 * identical curve — only {@link TrunkLine}'s own color signals where a list
 * ends (fading through the "+ Add subitem" row and the trailing gap row
 * after it), matching the approved design exactly rather than branching the
 * curve's own geometry per row.
 */
const TREE_BRANCH_HEIGHT = 21;
/** Branch height used by the (paler) "+ Add subitem" footer row. */
const TREE_BRANCH_HEIGHT_FADED = 20;
/** Height, in px, of the subitem panel's own mini column-header row (its content box only — see {@link SUBITEM_HEADER_TOP_GAP}). */
const SUBITEM_HEADER_HEIGHT = 36;
/** Top margin, in px, pushing the subitem panel's header box down from the parent row above it — the gap this reveals is where the trunk line keeps running, matching the design's own boxed-header treatment. */
const SUBITEM_HEADER_TOP_GAP = 8;
/** Height, in px, of a subitem row — a fixed value (not derived from the root row height), matching the approved design. */
const SUBITEM_ROW_HEIGHT_PX = 40;
/** Height, in px, of the breathing-room row after a subitem list's last row, before the next root item begins. */
const SUBITEM_TRAILING_GAP_HEIGHT = 16;

type TrunkVariant = "solid" | "faded" | "gap";

/**
 * One row's segment of a subitem list's continuous vertical trunk line — a
 * thin line absolutely positioned within a slot, overlapping its own row by
 * 1px top and bottom so consecutive rows' segments knit into one seamless
 * line down the whole list (mirroring the design's own technique, rather
 * than a single tall element that would need to know the list's total
 * height up front). `variant` fades the line as the list winds down: solid
 * through every real subitem, a gradient on the "+ Add subitem" row, and a
 * flat soft tail through the trailing gap row after it.
 */
const TrunkLine: React.FC<{ variant: TrunkVariant; solid_color: string; soft_color: string }> = ({
  variant,
  solid_color,
  soft_color,
}) => {
  const background =
    variant === "solid" ? solid_color : variant === "gap" ? soft_color : `linear-gradient(${solid_color}, ${soft_color} 70%)`;
  return (
    <div className="relative flex-none" style={{ width: TRUNK_SLOT_WIDTH }} aria-hidden="true">
      <div
        className="absolute"
        style={{ left: (TRUNK_SLOT_WIDTH - TRUNK_LINE_WIDTH) / 2, top: -1, bottom: -1, width: TRUNK_LINE_WIDTH, background }}
      />
    </div>
  );
};

/**
 * The curved branch connecting one subitem row to the {@link TrunkLine}
 * running down its left — a fixed-height border corner (`border-bottom` +
 * `border-left` bent around a `border-bottom-left-radius`) rather than an
 * SVG path, matching the design's own connector technique exactly.
 */
const TreeBranch: React.FC<{ color: string; height: number }> = ({ color, height }) => (
  <div className="relative flex-none" style={{ width: TREE_INDENT_PX }} aria-hidden="true">
    <div
      className="absolute rounded-bl-[9px]"
      style={{
        left: -TRUNK_LINE_WIDTH,
        top: -1,
        width: TREE_INDENT_PX + TRUNK_LINE_WIDTH,
        height,
        borderBottom: `${TRUNK_LINE_WIDTH}px solid ${color}`,
        borderLeft: `${TRUNK_LINE_WIDTH}px solid ${color}`,
      }}
    />
  </div>
);

/**
 * Which row a drag started from — a root row (identified by its own group)
 * or a subitem (identified by its parent row). Plain, non-generic (row ids
 * are always strings via `getRowId`), so it lives at module scope rather
 * than inside the generic `BoardTable<TRow>`.
 */
type DragSource =
  | { kind: "root"; row_id: string; group_id: string }
  | { kind: "subitem"; row_id: string; parent_id: string };

/**
 * Where a drag is currently hovering, expressed as an index into the
 * destination list *excluding* the dragged row (so it stays valid whether
 * or not the drag started in that same list) — see `commitRootDrop`/
 * `commitSubitemDrop` for how this becomes the final ordered-id array.
 */
type DropTarget =
  | { kind: "root"; group_id: string; index: number }
  | { kind: "subitem"; parent_id: string; index: number };

type AddItemInputRowProps = {
  height: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  /** The rail/tree-guide elements rendered before the checkbox — a root row's plain rail, or a subitem row's trunk+branch+rail combo. */
  leading: React.ReactNode;
};

/**
 * Replaces the static "+ Add item"/"+ Add subitem" footer text with a real
 * text input, in place, when a group is actively adding a row — no popover/
 * dialog. Enter submits a non-empty name; Escape or blurring an empty input
 * cancels.
 */
const AddItemInputRow: React.FC<AddItemInputRowProps> = ({ height, onSubmit, onCancel, leading }) => {
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
    <div className="flex items-stretch border-t border-boardtree-border-soft bg-boardtree-surface" style={{ height }}>
      {leading}
      <div className="flex flex-none items-center justify-center" style={{ width: CHECKBOX_WIDTH }}>
        <BoardCheckbox borderColor="var(--color-boardtree-border)" />
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
        className="mx-3 flex-1 rounded-[6px] border-2 border-boardtree-accent bg-boardtree-surface px-2 py-1 text-[13px] text-boardtree-text outline-none"
        style={{ maxWidth: 280 }}
      />
    </div>
  );
};

/**
 * Generic, reusable Monday-style board table, skinned to match the
 * client-approved "Table board tree subitems" design (see
 * `design/desing_3/Table_board_tree_subitems.dc.html`, and the
 * `src/components/task-board/*` reference build). It owns group collapse
 * state, drag-and-drop reorder state, and the fixed-column layout; callers
 * supply the columns, grouped rows and a `renderCell` function, so any
 * future board view can reuse this shell. The design's own blue/IBM-Plex
 * identity is scoped to this component via `boardTreeFontClassName` and the
 * `--color-boardtree-*` tokens (see `globals.css`) rather than the app's
 * shared shell tokens, so it doesn't bleed into the rest of the app.
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
  onReorderRow,
  onReorderSubitem,
  getColumnText,
}: BoardTableProps<TRow>) {
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [expanded_row_ids, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [editing_group_id, setEditingGroupId] = useState<string | null>(null);
  const [editing_column_id, setEditingColumnId] = useState<string | null>(null);
  const [add_column_anchor, setAddColumnAnchor] = useState<HTMLElement | null>(null);
  const [add_subitem_column_anchor, setAddSubitemColumnAnchor] = useState<HTMLElement | null>(null);
  const [drag_source, setDragSource] = useState<DragSource | null>(null);
  const [drop_target, setDropTarget] = useState<DropTarget | null>(null);
  const row_height_px = BOARD_ROW_HEIGHT_PX[rowHeight];
  const subitem_row_height_px = SUBITEM_ROW_HEIGHT_PX;
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
   * Commits a root-row drag: builds the destination table's final order
   * (inserting the dragged row's id at `drop_target.index`, counted among
   * that table's rows *excluding* the dragged one) and, when the drop
   * landed in a *different* table, also builds the origin table's own
   * remaining order so the backend can resequence both in one call. Reads
   * `groups` fresh (a prop, not a shadow copy) so the result always reflects
   * the real current order, not a locally-mutated guess.
   */
  const commitRootDrop = () => {
    const source = drag_source;
    const target = drop_target;
    setDragSource(null);
    setDropTarget(null);
    if (!source || source.kind !== "root" || !target || target.kind !== "root" || !onReorderRow) return;

    const from_group = groups.find((group) => group.id === source.group_id);
    const to_group = groups.find((group) => group.id === target.group_id);
    if (!from_group || !to_group) return;

    const to_without_dragged = to_group.rows.filter((row) => getRowId(row) !== source.row_id);
    const clamped_index = Math.min(Math.max(target.index, 0), to_without_dragged.length);
    const target_ordered_ids = [
      ...to_without_dragged.slice(0, clamped_index).map(getRowId),
      source.row_id,
      ...to_without_dragged.slice(clamped_index).map(getRowId),
    ];
    const is_cross_group = from_group.id !== to_group.id;

    onReorderRow({
      row_id: source.row_id,
      from_group_id: from_group.id,
      to_group_id: to_group.id,
      target_ordered_ids,
      source_ordered_ids: is_cross_group
        ? from_group.rows.filter((row) => getRowId(row) !== source.row_id).map(getRowId)
        : undefined,
    });
  };

  /** A root row's dragover handler — updates `drop_target` to land before/after whichever row is under the pointer, based on which half of the row it's over. */
  const handleRootRowDragOver = (event: React.DragEvent<HTMLDivElement>, group_id: string, hovered_row_id: string) => {
    if (!drag_source || drag_source.kind !== "root") return;
    event.preventDefault();
    if (hovered_row_id === drag_source.row_id) return;
    const group = groups.find((g) => g.id === group_id);
    if (!group) return;
    const without_dragged = group.rows.filter((row) => getRowId(row) !== drag_source.row_id);
    const hover_index = without_dragged.findIndex((row) => getRowId(row) === hovered_row_id);
    if (hover_index === -1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const is_after = event.clientY - rect.top > rect.height / 2;
    setDropTarget({ kind: "root", group_id, index: is_after ? hover_index + 1 : hover_index });
  };

  /** Dragover for a root-scope append target (the empty-state row / the "+ Add item" footer) — always lands at the end of that table. */
  const handleRootAppendDragOver = (event: React.DragEvent<HTMLDivElement>, group_id: string) => {
    if (!drag_source || drag_source.kind !== "root") return;
    event.preventDefault();
    const group = groups.find((g) => g.id === group_id);
    if (!group) return;
    const count = group.rows.filter((row) => getRowId(row) !== drag_source.row_id).length;
    setDropTarget({ kind: "root", group_id, index: count });
  };

  /** Mirrors {@link commitRootDrop} for a subitem drag — always within the same parent, never a cross-parent move. */
  const commitSubitemDrop = (parent_row_id: string, children: TRow[]) => {
    const source = drag_source;
    const target = drop_target;
    setDragSource(null);
    setDropTarget(null);
    if (!source || source.kind !== "subitem" || source.parent_id !== parent_row_id) return;
    if (!target || target.kind !== "subitem" || target.parent_id !== parent_row_id) return;
    if (!onReorderSubitem) return;

    const without_dragged = children.filter((row) => getRowId(row) !== source.row_id);
    const clamped_index = Math.min(Math.max(target.index, 0), without_dragged.length);
    const ordered_ids = [
      ...without_dragged.slice(0, clamped_index).map(getRowId),
      source.row_id,
      ...without_dragged.slice(clamped_index).map(getRowId),
    ];
    onReorderSubitem(parent_row_id, ordered_ids);
  };

  const handleSubitemRowDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    parent_row_id: string,
    children: TRow[],
    hovered_row_id: string
  ) => {
    if (!drag_source || drag_source.kind !== "subitem" || drag_source.parent_id !== parent_row_id) return;
    event.preventDefault();
    if (hovered_row_id === drag_source.row_id) return;
    const without_dragged = children.filter((row) => getRowId(row) !== drag_source.row_id);
    const hover_index = without_dragged.findIndex((row) => getRowId(row) === hovered_row_id);
    if (hover_index === -1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const is_after = event.clientY - rect.top > rect.height / 2;
    setDropTarget({ kind: "subitem", parent_id: parent_row_id, index: is_after ? hover_index + 1 : hover_index });
  };

  const handleSubitemAppendDragOver = (event: React.DragEvent<HTMLDivElement>, parent_row_id: string, children: TRow[]) => {
    if (!drag_source || drag_source.kind !== "subitem" || drag_source.parent_id !== parent_row_id) return;
    event.preventDefault();
    const count = children.filter((row) => getRowId(row) !== drag_source.row_id).length;
    setDropTarget({ kind: "subitem", parent_id: parent_row_id, index: count });
  };

  const clearDrag = () => {
    setDragSource(null);
    setDropTarget(null);
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
        /** The subitem trunk/branch's own color, at full and faded strength — see {@link TrunkLine}. */
        const trunk_solid_color = group.accent_color;
        const trunk_soft_color = `color-mix(in srgb, ${group.accent_color} 35%, white)`;
        const total_subitem_count = getChildren || getSubitemCount
          ? group.rows.reduce((sum, row) => sum + (getSubitemCount?.(row) ?? getChildren?.(row)?.length ?? 0), 0)
          : null;

        /**
         * The id of the root row this table's drop indicator should render
         * before, `null` when it should render after the last row (append),
         * or `undefined` when no root drag is currently hovering this table.
         */
        const root_drop_before_id: string | null | undefined = (() => {
          if (
            !drag_source ||
            drag_source.kind !== "root" ||
            !drop_target ||
            drop_target.kind !== "root" ||
            drop_target.group_id !== group.id
          ) {
            return undefined;
          }
          const without_dragged = group.rows.filter((row) => getRowId(row) !== drag_source.row_id);
          const clamped = Math.min(Math.max(drop_target.index, 0), without_dragged.length);
          return clamped < without_dragged.length ? getRowId(without_dragged[clamped]) : null;
        })();

        /**
         * Renders one subitem row using {@link subitemColumns} — a separate
         * column set from the parent table's own {@link columns}, mirroring
         * the design's subitems living on an implicit separate sub-board.
         * The trunk/branch/rail trio leads the row (before the checkbox),
         * exactly like a root row's own single rail leads it — not nested
         * inside the tree/name cell, matching the design's own row anatomy.
         */
        const renderSubitemRow = (
          row: TRow,
          parent_row_id: string,
          children: TRow[],
          tree_width_override: number | undefined,
          show_insertion_before: boolean
        ): React.ReactNode => {
          const row_id = getRowId(row);
          const is_drawer_open = selectedRowId === row_id;
          const is_checkbox_selected = selectedRowIds?.has(row_id) ?? false;
          const is_dragged = drag_source?.kind === "subitem" && drag_source.row_id === row_id;
          const row_background =
            rowColors[row_id] ??
            (is_checkbox_selected ? CHECKBOX_SELECTED_ROW_BG : is_drawer_open ? SELECTED_ROW_BG : undefined);
          const row_cell_colors = cellColors[row_id];

          return (
            <React.Fragment key={row_id}>
              {show_insertion_before && <DropInsertionLine indent={TRUNK_SLOT_WIDTH + TREE_INDENT_PX} />}
              <div
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                draggable={Boolean(onReorderSubitem)}
                onDragStart={
                  onReorderSubitem
                    ? (event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDragSource({ kind: "subitem", row_id, parent_id: parent_row_id });
                      }
                    : undefined
                }
                onDragOver={
                  onReorderSubitem
                    ? (event) => handleSubitemRowDragOver(event, parent_row_id, children, row_id)
                    : undefined
                }
                onDrop={
                  onReorderSubitem
                    ? (event) => {
                        event.preventDefault();
                        commitSubitemDrop(parent_row_id, children);
                      }
                    : undefined
                }
                onDragEnd={onReorderSubitem ? clearDrag : undefined}
                className={`flex items-stretch transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                  row_background ? "" : "hover:bg-boardtree-hover"
                }`}
                style={{
                  height: subitem_row_height_px,
                  opacity: is_dragged ? 0.45 : 1,
                  borderBottom: "1px solid var(--color-boardtree-border-soft)",
                  borderRight: "1px solid var(--color-boardtree-border)",
                  background: row_background ?? "var(--color-boardtree-surface)",
                }}
              >
                <TrunkLine variant="solid" solid_color={trunk_solid_color} soft_color={trunk_soft_color} />
                <TreeBranch color={trunk_solid_color} height={TREE_BRANCH_HEIGHT} />
                <GroupRail color={trunk_solid_color} />
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
                  const column_width = is_tree_column && tree_width_override !== undefined ? tree_width_override : column.width;
                  return (
                    <div
                      key={column.id}
                      className={`flex flex-none items-center border-r border-boardtree-border-soft ${
                        column.align === "center" ? "justify-center" : "justify-start"
                      } ${column.bleed ? "" : "px-3"}`}
                      style={{
                        width: column_width,
                        height: subitem_row_height_px,
                        ...(!column.bleed && cell_background ? { background: cell_background } : {}),
                      }}
                    >
                      {is_tree_column ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          {onReorderSubitem && (
                            <DragHandleIcon size={9} className="flex-none cursor-grab text-boardtree-text-faint" />
                          )}
                          <div className="min-w-0 flex-1 truncate">{renderCell(row, column)}</div>
                        </div>
                      ) : (
                        renderCell(row, column)
                      )}
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          );
        };

        /**
         * Wraps a row's direct subitems in their own boxed mini-table: an
         * inset column-header (pushed down from the parent row and sized to
         * its own columns, not stretched full-width — the gap this leaves,
         * above and to its right, is intentional and is where the trunk
         * line / page background show through), the subitem rows
         * themselves (full-width, unlike the header), the "+ Add subitem"
         * footer with its own fading trunk, and a final breathing-room row
         * that fades the trunk out entirely before the next root item.
         */
        const renderSubitemsPanel = (parent_row_id: string, children: TRow[]): React.ReactNode => {
          const has_footer = Boolean(onAddSubitem);
          const is_adding = addingSubitemParentId === parent_row_id;

          /**
           * The subitem tree/name column's width, widened to fit the
           * longest visible subitem name (clamped 150–340px), mirroring the
           * approved design's own auto-sizing. Only computed when a caller
           * supplies {@link getColumnText}; falls back to the column's own
           * fixed width otherwise. Recomputed per parent row, so each
           * panel's width reflects only its own children.
           */
          const dynamic_tree_width =
            getColumnText && subitem_tree_column_id
              ? Math.min(
                  340,
                  Math.max(
                    150,
                    Math.round(
                      children.reduce(
                        (max, child) => Math.max(max, getColumnText(child, subitem_tree_column_id).length),
                        0
                      ) * 6.9
                    ) + 53
                  )
                )
              : undefined;

          /** Mirrors {@link root_drop_before_id}, scoped to this parent's own subitem list. */
          const subitem_drop_before_id: string | null | undefined = (() => {
            if (
              !drag_source ||
              drag_source.kind !== "subitem" ||
              drag_source.parent_id !== parent_row_id ||
              !drop_target ||
              drop_target.kind !== "subitem" ||
              drop_target.parent_id !== parent_row_id
            ) {
              return undefined;
            }
            const without_dragged = children.filter((row) => getRowId(row) !== drag_source.row_id);
            const clamped = Math.min(Math.max(drop_target.index, 0), without_dragged.length);
            return clamped < without_dragged.length ? getRowId(without_dragged[clamped]) : null;
          })();

          const subitem_leading = (variant: TrunkVariant, branch_color: string, branch_height: number, rail_color: string) => (
            <>
              <TrunkLine variant={variant} solid_color={trunk_solid_color} soft_color={trunk_soft_color} />
              <TreeBranch color={branch_color} height={branch_height} />
              <GroupRail color={rail_color} />
            </>
          );

          return (
            <div>
              {/* Boxed, inset column header — pushed down from the parent row (revealing the trunk through the gap) and sized to its own columns only, not stretched to the table's full width. */}
              <div
                className="flex items-stretch"
                style={{ height: SUBITEM_HEADER_HEIGHT + SUBITEM_HEADER_TOP_GAP, background: "var(--color-boardtree-bg)" }}
              >
                <TrunkLine variant="solid" solid_color={trunk_solid_color} soft_color={trunk_soft_color} />
                <div className="flex-none" style={{ width: TREE_INDENT_PX }} />
                <div
                  className="flex-none rounded-tl-[3px]"
                  style={{ width: GROUP_RAIL_WIDTH, height: SUBITEM_HEADER_HEIGHT, marginTop: SUBITEM_HEADER_TOP_GAP, background: trunk_solid_color }}
                />
                <div
                  className="flex flex-none items-stretch rounded-tr-[10px] border border-b-0 border-l-0 border-boardtree-border bg-boardtree-panel-alt"
                  style={{ marginTop: SUBITEM_HEADER_TOP_GAP, height: SUBITEM_HEADER_HEIGHT }}
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
                    const is_tree_column = column.id === subitem_tree_column_id;
                    const column_width = is_tree_column && dynamic_tree_width !== undefined ? dynamic_tree_width : column.width;
                    // Keyed by group *and* column, same as the parent header, so
                    // clicking one panel's copy of a header doesn't also open
                    // every other group's copy of the same (board-wide) column.
                    const editing_key = `subitem::${group.id}::${column.id}`;
                    return (
                      <div
                        key={column.id}
                        className={`flex flex-none items-center border-r border-boardtree-border-soft ${column.bleed ? "" : "px-3"}`}
                        style={{ width: column_width }}
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
              </div>

              {children.map((child) =>
                renderSubitemRow(
                  child,
                  parent_row_id,
                  children,
                  dynamic_tree_width,
                  subitem_drop_before_id === getRowId(child)
                )
              )}
              {subitem_drop_before_id === null && <DropInsertionLine indent={TRUNK_SLOT_WIDTH + TREE_INDENT_PX} />}

              {has_footer &&
                (is_adding ? (
                  <AddItemInputRow
                    height={subitem_row_height_px}
                    onSubmit={(name) => onSubmitNewSubitem?.(parent_row_id, name)}
                    onCancel={() => onCancelAddSubitem?.()}
                    leading={subitem_leading("solid", trunk_solid_color, TREE_BRANCH_HEIGHT, trunk_solid_color)}
                  />
                ) : (
                  <div className="flex items-stretch" style={{ height: subitem_row_height_px }}>
                    {subitem_leading("faded", trunk_soft_color, TREE_BRANCH_HEIGHT_FADED, trunk_soft_color)}
                    <div
                      onClick={() => openAddSubitem(parent_row_id)}
                      onDragOver={onReorderSubitem ? (event) => handleSubitemAppendDragOver(event, parent_row_id, children) : undefined}
                      onDrop={
                        onReorderSubitem
                          ? (event) => {
                              event.preventDefault();
                              commitSubitemDrop(parent_row_id, children);
                            }
                          : undefined
                      }
                      className="flex flex-1 cursor-pointer items-stretch rounded-br-[10px] border-b border-r border-boardtree-border bg-boardtree-surface hover:bg-boardtree-hover"
                    >
                      <div className="flex flex-none items-center justify-center border-r border-boardtree-border-soft" style={{ width: CHECKBOX_WIDTH }} />
                      <div className="flex flex-1 items-center pl-3 text-[12.5px] text-boardtree-text-faint hover:text-boardtree-accent">
                        + Add subitem
                      </div>
                    </div>
                  </div>
                ))}

              {/* Breathing-room row fading the trunk out entirely before the next root item begins. */}
              <div className="flex items-stretch" style={{ height: SUBITEM_TRAILING_GAP_HEIGHT, background: "var(--color-boardtree-bg)" }}>
                <TrunkLine variant="gap" solid_color={trunk_solid_color} soft_color={trunk_soft_color} />
                <div className="flex-1" />
              </div>
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
          const is_dragged = drag_source?.kind === "root" && drag_source.row_id === row_id;
          const row_background =
            rowColors[row_id] ??
            (is_checkbox_selected ? CHECKBOX_SELECTED_ROW_BG : is_drawer_open ? SELECTED_ROW_BG : undefined);
          const row_cell_colors = cellColors[row_id];
          const children = getChildren?.(row);
          const subitem_count = getSubitemCount?.(row) ?? children?.length ?? 0;
          const has_toggle = subitem_count > 0 || Boolean(children?.length);
          const is_row_expanded = expanded_row_ids[row_id] ?? false;
          const show_insertion_before = root_drop_before_id === row_id;

          return (
            <React.Fragment key={row_id}>
              {show_insertion_before && <DropInsertionLine />}
              <div
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                draggable={Boolean(onReorderRow)}
                onDragStart={
                  onReorderRow
                    ? (event) => {
                        event.dataTransfer.effectAllowed = "move";
                        setDragSource({ kind: "root", row_id, group_id: group.id });
                      }
                    : undefined
                }
                onDragOver={onReorderRow ? (event) => handleRootRowDragOver(event, group.id, row_id) : undefined}
                onDrop={
                  onReorderRow
                    ? (event) => {
                        event.preventDefault();
                        commitRootDrop();
                      }
                    : undefined
                }
                onDragEnd={onReorderRow ? clearDrag : undefined}
                className={`group/row flex items-stretch border-t border-boardtree-border-soft transition-colors ${
                  row_background ? "" : "bg-boardtree-surface hover:bg-boardtree-hover"
                } ${onRowClick ? "cursor-pointer" : ""}`}
                style={{
                  height: row_height_px,
                  opacity: is_dragged ? 0.45 : 1,
                  ...(row_background ? { background: row_background } : {}),
                }}
              >
                <GroupRail color={group.accent_color} />
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
                          {onReorderRow && (
                            <DragHandleIcon size={9} className="flex-none cursor-grab text-boardtree-text-faint" />
                          )}
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
                  header/footer rail only (a plain 3px radius, not the whole row) instead.
                */}
                {/* Column header row */}
                <div className="flex items-stretch border-t border-boardtree-border bg-boardtree-surface text-[12.5px] font-medium text-boardtree-text-muted">
                  <GroupRail color={group.accent_color} rounded="tl" />
                  <div
                    className="flex flex-none items-center justify-center border-r border-boardtree-border-soft py-[11px]"
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
                      height={row_height_px}
                      onSubmit={(name) => onSubmitNewItem?.(group.id, name)}
                      onCancel={() => onCancelAddItem?.()}
                      leading={<GroupRail color={group.accent_color} />}
                    />
                  ) : (
                    <div
                      onClick={onAddItem ? () => onAddItem(group.id) : undefined}
                      onDragOver={onReorderRow ? (event) => handleRootAppendDragOver(event, group.id) : undefined}
                      onDrop={
                        onReorderRow
                          ? (event) => {
                              event.preventDefault();
                              commitRootDrop();
                            }
                          : undefined
                      }
                      className={`flex items-stretch border-t border-boardtree-border-soft bg-boardtree-surface ${
                        onAddItem ? "cursor-pointer hover:bg-boardtree-hover" : ""
                      }`}
                      style={{ height: row_height_px }}
                    >
                      <GroupRail color={group.accent_color} />
                      <div
                        className="flex flex-none items-center justify-center"
                        style={{ width: CHECKBOX_WIDTH }}
                      >
                        <BoardCheckbox borderColor="var(--color-boardtree-border)" />
                      </div>
                      <div className="flex items-center px-3 text-[13px] text-boardtree-text-faint hover:text-boardtree-accent">
                        + Add item
                      </div>
                    </div>
                  ))}

                {/* Rows */}
                {group.rows.map((row) => renderRow(row))}
                {root_drop_before_id === null && <DropInsertionLine />}

                {/* Add-item footer */}
                {!is_empty &&
                  (addingItemGroupId === group.id ? (
                    <AddItemInputRow
                      height={40}
                      onSubmit={(name) => onSubmitNewItem?.(group.id, name)}
                      onCancel={() => onCancelAddItem?.()}
                      leading={<GroupRail color={group.accent_color} />}
                    />
                  ) : (
                    <div
                      onClick={onAddItem ? () => onAddItem(group.id) : undefined}
                      onDragOver={onReorderRow ? (event) => handleRootAppendDragOver(event, group.id) : undefined}
                      onDrop={
                        onReorderRow
                          ? (event) => {
                              event.preventDefault();
                              commitRootDrop();
                            }
                          : undefined
                      }
                      className={`flex h-10 items-stretch border-t border-boardtree-border-soft bg-boardtree-surface ${
                        onAddItem ? "cursor-pointer hover:bg-boardtree-hover" : ""
                      }`}
                    >
                      <GroupRail color={`color-mix(in srgb, ${group.accent_color} 35%, white)`} rounded="bl" />
                      <div
                        className="flex flex-none items-center justify-center"
                        style={{ width: CHECKBOX_WIDTH }}
                      >
                        <BoardCheckbox borderColor="var(--color-boardtree-border)" />
                      </div>
                      <div className="flex items-center px-3 text-[13px] text-boardtree-text-faint hover:text-boardtree-accent">
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
