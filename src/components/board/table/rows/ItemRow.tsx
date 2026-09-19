"use client";

import { useEffect, useRef } from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup, BoardTableItem } from "../types";
import { ROW_HEIGHT_PX, mainGridTemplate, mainStickyOffsets } from "../layoutUtils";
import CellRenderer from "../cells/CellRenderer";
import RowMenu, { type RowMenuTarget } from "../menus/RowMenu";
import TreeBar from "./TreeBar";
import { isValueInvalid } from "../validationUtils";
import EmojiInsertButton from "../../EmojiInsertButton";

/** Wraps the (case-insensitive) first occurrence of `query` inside `text` in a `<mark>`, for the item-title span's Ctrl/Cmd+F active-match highlight. Returns `text` unchanged when there's no match. */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[2px] bg-[#fdab3d] text-[#1e2237]">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

interface ItemRowProps {
  item: BoardTableItem;
  group: BoardTableGroup;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

export default function ItemRow({ item, group, name_col_width, min_width, state, actions }: ItemRowProps) {
  const is_open = !!state.open_map[item.id];
  const is_selected = !!state.selected_map[item.id];
  const is_editing = state.editing_id === item.id;
  const is_hovered = state.hover_row_id === item.id;
  const is_row_menu_open = state.open_row_menu_id === item.id;
  const is_dragging = state.drag?.node_id === item.id;
  const row_h = ROW_HEIGHT_PX[state.row_height];
  const row_color = state.row_colors[item.id];
  const row_bg = is_selected ? "var(--color-boardtree-selected)" : (row_color ?? "var(--color-boardtree-surface)");
  const is_active_match = state.active_search_match?.node_id === item.id;
  const is_active_name_match = is_active_match && state.active_search_match?.column_id === "__name";
  // The Item column (checkbox + name + comment icon) always freezes; any
  // extra leading value columns freeze too once pinned from the toolbar's
  // "Choose columns to pin" control, see `mainStickyOffsets`'s own comment.
  const pinned_columns = group.base_columns.slice(0, state.pinned_column_count);
  const sticky_offsets = mainStickyOffsets(name_col_width, pinned_columns);

  const move_targets: RowMenuTarget[] = state.groups.map((g) => ({ id: g.key, label: g.title, current: g.key === group.key }));
  const convert_targets: RowMenuTarget[] = state.groups.flatMap((g) => g.items.filter((it) => it.id !== item.id).map((it) => ({ id: it.id, label: it.name })));

  const main_tpl = mainGridTemplate(name_col_width, group.base_columns, group.custom_columns);
  const menu_btn_ref = useRef<HTMLButtonElement>(null);
  const name_input_ref = useRef<HTMLInputElement>(null);
  // Picking an emoji blurs the name input (the picker's grid is a portaled
  // element outside it), which would otherwise reach `onBlur` before the
  // pick's own text update lands and commit the edit out from under it.
  const is_emoji_palette_open_ref = useRef(false);
  // A native `dragstart` event's own `target` is always the row (the
  // `draggable` element itself), never the fill handle the gesture actually
  // began on — so the row's `onDragStart` can't tell the two apart just by
  // inspecting the event. This ref is set synchronously by the handle's own
  // `onMouseDown` (which always fires first) and read once by the very next
  // `onDragStart`, letting the row cancel its own native drag when that's
  // where the gesture really came from.
  const fill_handle_mousedown_ref = useRef(false);
  // A fill-drag ends on a plain `mouseup` (no native `dragend` ever fires,
  // since `dragstart` was cancelled) — this is what clears the ref again for
  // the row's next, ordinary drag-to-reorder gesture.
  useEffect(() => {
    const clear = () => { fill_handle_mousedown_ref.current = false; };
    window.addEventListener("mouseup", clear);
    return () => window.removeEventListener("mouseup", clear);
  }, []);

  const row_ref = useRef<HTMLDivElement>(null);
  // Ctrl/Cmd+F "N of M" jump navigation — scrolls the newly active match's
  // row into view, mirroring a browser's own in-page find.
  useEffect(() => {
    if (is_active_match) row_ref.current?.scrollIntoView({ block: "nearest" });
  }, [is_active_match]);

  return (
    <div
      ref={row_ref}
      className="relative flex items-stretch"
      style={{
        minWidth: min_width,
        background: row_bg,
        opacity: is_dragging ? 0.45 : 1,
        outline: is_active_match ? "2px solid #fdab3d" : undefined,
        outlineOffset: is_active_match ? "-2px" : undefined,
      }}
      draggable={!state.read_only}
      onDragStart={(e) => {
        // See `fill_handle_mousedown_ref`'s own doc comment — a fill-handle
        // drag starts inside this same `draggable` row, and must cancel the
        // row's own native drag instead of reordering it.
        if (fill_handle_mousedown_ref.current) {
          e.preventDefault();
          return;
        }
        actions.onDragStart(item.id, "ROOT");
      }}
      onDragOver={(e) => { e.preventDefault(); actions.onDragOver(item.id, "ROOT"); }}
      onDragEnd={actions.onDragEnd}
      onMouseEnter={() => actions.setHoverRow(item.id)}
      onMouseLeave={() => actions.setHoverRow(null)}
    >
      {!state.read_only && (
        <div className="absolute -left-[27px] top-2 z-[120]">
          <button
            ref={menu_btn_ref}
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.openRowMenu(item.id); }}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover-strong hover:text-boardtree-accent"
            style={{ background: is_row_menu_open ? "var(--color-boardtree-hover-strong)" : "transparent", opacity: is_hovered || is_row_menu_open ? 1 : 0, pointerEvents: is_hovered || is_row_menu_open ? "auto" : "none" }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
          </button>
          {is_row_menu_open && (
            <RowMenu
              is_sub={false}
              anchor_el={menu_btn_ref.current}
              move_targets={move_targets}
              convert_targets={convert_targets}
              copied={state.copied_row_id === item.id}
              onOpen={() => {}}
              is_priority={!!item.is_priority}
              recurrence={item.recurrence}
              onCopyLink={() => actions.copyRowLink(item.id)}
              onCreateBelow={() => actions.createBelow(item.id)}
              onAddSubitem={() => actions.addSubitem(item.id)}
              onDuplicate={(with_subs) => actions.duplicateNode(item.id, with_subs)}
              onMoveTo={(target_id) => actions.moveItemToGroup(item.id, target_id)}
              onConvertToItem={() => {}}
              onConvertToSubOf={(target_id) => actions.convertItemToSub(item.id, target_id)}
              onTogglePriority={() => actions.toggleNodePriority(item.id)}
              onSetRecurrence={(frequency, interval_count) => actions.setItemRecurrence(item.id, { frequency, interval_count })}
              onClearRecurrence={() => actions.clearItemRecurrence(item.id)}
              onArchive={() => actions.deleteNode(item.id)}
              onDelete={() => actions.deleteNode(item.id)}
              onClose={actions.closeRowMenu}
            />
          )}
        </div>
      )}

      <TreeBar variant="thick" color={group.color} />

      <div className="flex-1 border-b border-boardtree-border-soft" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="flex items-center justify-center border-r border-boardtree-border-soft" style={{ height: row_h, position: "sticky", left: sticky_offsets[0], zIndex: 15, background: row_bg }}>
          <button type="button" onClick={() => actions.toggleSelected(item.id)} className="flex items-center justify-center">
            {is_selected ? (
              <span className="flex h-[15px] w-[15px] items-center justify-center rounded-[3px] bg-boardtree-accent">
                <svg viewBox="0 0 14 14" width="10" height="10"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </span>
            ) : (
              <span className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-boardtree-border bg-boardtree-surface hover:border-boardtree-accent" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 border-r border-boardtree-border-soft pl-1 pr-3" style={{ height: row_h, position: "sticky", left: sticky_offsets[1], zIndex: 15, background: row_bg }}>
          <div className="flex w-3 flex-none cursor-grab items-center justify-center text-boardtree-text-faint">
            <svg viewBox="0 0 6 14" width="6" height="12"><circle cx="1.5" cy="3" r="1.1" fill="currentColor" /><circle cx="4.5" cy="3" r="1.1" fill="currentColor" /><circle cx="1.5" cy="7" r="1.1" fill="currentColor" /><circle cx="4.5" cy="7" r="1.1" fill="currentColor" /><circle cx="1.5" cy="11" r="1.1" fill="currentColor" /><circle cx="4.5" cy="11" r="1.1" fill="currentColor" /></svg>
          </div>
          <button type="button" onClick={() => actions.toggleItemOpen(item.id)} className="flex h-5 w-5 flex-none items-center justify-center rounded-[4px] text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-text">
            {is_open ? (
              <svg viewBox="0 0 12 12" width="11" height="11"><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            ) : (
              <svg viewBox="0 0 12 12" width="11" height="11"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            )}
          </button>
          <div className="flex min-w-0 flex-1 items-center">
            {is_editing ? (
              <span className="relative flex min-w-0 flex-1 items-center">
                <input
                  ref={name_input_ref}
                  autoFocus
                  value={state.edit_draft}
                  onChange={(e) => actions.updateEditDraft(e.target.value)}
                  onBlur={() => { if (!is_emoji_palette_open_ref.current) actions.commitEditName(); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") actions.cancelEditName();
                  }}
                  className="h-[34px] w-full min-w-0 rounded-[4px] border-2 border-boardtree-accent bg-boardtree-surface py-0 pl-1.5 pr-7 text-[13.5px] font-medium text-boardtree-text outline-none"
                />
                <EmojiInsertButton
                  input_ref={name_input_ref}
                  value={state.edit_draft}
                  onChange={actions.updateEditDraft}
                  onOpenChange={(is_open) => { is_emoji_palette_open_ref.current = is_open; }}
                  size={13}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                />
              </span>
            ) : (
              <span
                onClick={() => actions.startEditName(item.id, item.name)}
                className={`max-w-full cursor-text rounded-[4px] px-1.5 py-1 text-[13px] text-boardtree-text ${
                  state.row_height === "quad"
                    ? "line-clamp-4 whitespace-normal"
                    : state.row_height === "triple"
                      ? "line-clamp-3 whitespace-normal"
                      : state.row_height === "double"
                        ? "line-clamp-2 whitespace-normal"
                        : "truncate"
                }`}
              >
                {is_active_name_match ? highlightMatch(item.name, state.search_query) : item.name}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.toggleNodePriority(item.id); }}
            title={item.is_priority ? "Unmark as priority" : "Mark as priority — this task sorts above the rest"}
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] hover:bg-boardtree-hover-strong"
            style={{
              color: item.is_priority ? "#fdab3d" : "var(--color-boardtree-text-faint)",
              opacity: is_hovered || item.is_priority ? 1 : 0,
              pointerEvents: is_hovered || item.is_priority ? "auto" : "none",
            }}
          >
            <svg viewBox="0 0 16 16" width="13" height="13">
              <path
                d="M8 1.7 l1.8 3.9 4.3 .5 -3.2 2.9 .9 4.2 -3.8 -2.2 -3.8 2.2 .9 -4.2 -3.2 -2.9 4.3 -.5z"
                fill={item.is_priority ? "currentColor" : "none"}
                stroke={item.is_priority ? "none" : "currentColor"}
                strokeWidth={item.is_priority ? undefined : "1.2"}
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {item.recurrence && (
            <span
              title={`Recurs every ${item.recurrence.interval_count} ${item.recurrence.frequency === "daily" ? "day(s)" : item.recurrence.frequency === "weekly" ? "week(s)" : "month(s)"}`}
              className="flex h-[18px] w-[18px] flex-none items-center justify-center text-boardtree-accent"
            >
              <svg viewBox="0 0 16 16" width="13" height="13"><path d="M3 8 a5 5 0 0 1 8.5 -3.5 M13 4.6 V7.4 H10.2 M13 8 a5 5 0 0 1 -8.5 3.5 M3 11.4 V8.6 H5.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )}
          {item.subs.length > 0 && (
            <button type="button" onClick={() => actions.toggleItemOpen(item.id)} className="flex-none rounded-[9px] bg-boardtree-hover px-[7px] py-0.5 font-mono text-[10.5px] text-boardtree-text-secondary">
              {item.subs.length}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.openItem(item.id); }}
            title="Open item"
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-hover-strong hover:text-boardtree-accent"
            style={{ opacity: is_hovered ? 1 : 0, pointerEvents: is_hovered ? "auto" : "none" }}
          >
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M5.4 2.6 H2.6 V5.4 M8.6 2.6 H11.4 V5.4 M5.4 11.4 H2.6 V8.6 M8.6 11.4 H11.4 V8.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.addSubitem(item.id); }}
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-accent"
          >
            <svg viewBox="0 0 14 14" width="13" height="13"><circle cx="7" cy="7" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4.6 V9.4 M4.6 7 H9.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex items-center justify-center border-r border-boardtree-border-soft" style={{ height: row_h, position: "sticky", left: sticky_offsets[2], zIndex: 15, background: row_bg }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.openComments(item.id); }}
            className="relative flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-accent"
          >
            <svg viewBox="0 0 18 18" width="16" height="16"><path d="M2.2 8.1 a6.4 5.4 0 1 1 3.4 4.8 L2.4 13.9 l1 -3 a5.2 5.2 0 0 1 -1.2 -2.8 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M9 5.9 V10.1 M6.9 8 H11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            {!!item.comment_count && (
              <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-boardtree-accent px-[3px] text-[9px] font-bold leading-none text-white">
                {item.comment_count > 99 ? "99+" : item.comment_count}
              </span>
            )}
          </button>
        </div>

        {group.base_columns.concat(group.custom_columns).map((col, col_index) => {
          const is_active = state.active_cell?.node_id === item.id && state.active_cell?.column_id === col.id;
          const is_fill_target =
            !!state.fill_drag &&
            state.fill_drag.column_id === col.id &&
            state.fill_drag.hovered_node_id === item.id &&
            state.fill_drag.anchor_node_id !== item.id;
          const is_pinned = col_index < pinned_columns.length;
          const is_invalid = !is_active && !is_fill_target && isValueInvalid(col, item.values[col.id]);
          const is_search_match = is_active_match && state.active_search_match?.column_id === col.id;
          return (
            <div
              key={col.id}
              className="relative flex min-w-0 items-stretch border-r border-boardtree-border-soft"
              title={is_invalid ? "This column requires a valid value" : undefined}
              style={{
                height: row_h,
                background: state.cell_colors[item.id]?.[col.id] ?? (is_pinned ? row_bg : undefined),
                position: is_pinned ? "sticky" : undefined,
                left: is_pinned ? sticky_offsets[3 + col_index] : undefined,
                // `outline` (not `box-shadow`) so the ring still shows on top
                // of a cell whose own content paints an opaque, edge-to-edge
                // background (Status/Label/Progress/Timeline pills) — an
                // inset box-shadow on this wrapper would otherwise be
                // completely covered by that child's fill.
                outline: is_active
                  ? "2px solid var(--color-boardtree-accent)"
                  : is_fill_target
                    ? "1.5px dashed var(--color-boardtree-accent)"
                    : is_search_match
                      ? "2px solid #fdab3d"
                      : is_invalid
                        ? "1.5px solid #e2445c"
                        : undefined,
                outlineOffset: is_active || is_fill_target || is_search_match || is_invalid ? "-2px" : undefined,
                zIndex: is_pinned ? 15 : is_active ? 5 : undefined,
              }}
              onMouseDown={() => actions.setActiveCell(item.id, col.id)}
              onMouseEnter={() => {
                if (state.fill_drag?.column_id === col.id) actions.updateFillDragHover(item.id);
              }}
            >
              <CellRenderer node_id={item.id} column={col} values={item.values} node_name={item.name} state={state} actions={actions} />
              {is_active && (
                <div
                  data-fill-handle="true"
                  draggable={false}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    fill_handle_mousedown_ref.current = true;
                    actions.startFillDrag(item.id, col.id);
                  }}
                  className="absolute -bottom-[4px] -right-[4px] z-10 h-[9px] w-[9px] cursor-crosshair rounded-[1.5px] border border-white bg-boardtree-accent"
                />
              )}
            </div>
          );
        })}

        <div style={{ height: row_h }} />
        <div style={{ height: row_h }} />
      </div>
    </div>
  );
}
