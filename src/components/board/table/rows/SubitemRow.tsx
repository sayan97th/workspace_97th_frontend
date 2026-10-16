"use client";

import { useEffect, useRef } from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup, BoardTableItem, BoardTableNode } from "../types";
import { SUB_ROW_HEIGHT_PX, subGridTemplate, subStickyOffsets } from "../layoutUtils";
import CellRenderer from "../cells/CellRenderer";
import RowMenu, { type RowMenuTarget } from "../menus/RowMenu";
import TreeBar from "./TreeBar";
import { useTextEntryDragLock } from "./useTextEntryDragLock";
import "./item-name-cell.scss";
import TreeHook from "./TreeHook";
import { isValueInvalid } from "../validationUtils";
import EmojiInsertButton from "../../EmojiInsertButton";
import { highlightSearchMatches } from "../searchHighlight";
import { columnMoveKey } from "../columnMove";

interface SubitemRowProps {
  sub: BoardTableNode;
  item: BoardTableItem;
  group: BoardTableGroup;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

export default function SubitemRow({ sub, item, group, name_col_width, min_width, state, actions }: SubitemRowProps) {
  const is_selected = !!state.selected_map[sub.id];
  const is_editing = state.editing_id === sub.id;
  const is_hovered = state.hover_row_id === sub.id;
  const is_row_menu_open = state.open_row_menu_id === sub.id;
  const is_dragging = state.drag?.node_id === sub.id;
  const row_h = SUB_ROW_HEIGHT_PX[state.row_height];
  // Editing the name highlights the whole row, like monday.com.
  const row_bg = is_selected || is_editing ? "var(--color-boardtree-selected)" : "var(--color-boardtree-surface)";
  const sticky_offsets = subStickyOffsets(name_col_width);

  const move_targets: RowMenuTarget[] = state.groups.flatMap((g) => g.items.map((it) => ({ id: it.id, label: it.name, current: it.id === item.id })));
  const row_apps = actions.getRowApps();
  const sub_tpl = subGridTemplate(name_col_width, group.sub_base_columns, group.sub_custom_columns);
  const menu_btn_ref = useRef<HTMLButtonElement>(null);
  const name_input_ref = useRef<HTMLInputElement>(null);
  // Picking an emoji blurs the name input (the picker's grid is a portaled
  // element outside it), which would otherwise reach `onBlur` before the
  // pick's own text update lands and commit the edit out from under it.
  const is_emoji_palette_open_ref = useRef(false);
  // See `ItemRow`'s identical ref for why this exists: a native `dragstart`
  // event's `target` is always the row (the `draggable` element), never the
  // fill handle a gesture actually began on, so the row's `onDragStart` reads
  // this ref (set synchronously by the handle's own `onMouseDown`, which
  // always fires first) instead of inspecting the event.
  const fill_handle_mousedown_ref = useRef(false);
  const grid_ref = useRef<HTMLDivElement>(null);
  const { is_text_entry_focused, shouldCancelDrag, lock_handlers } = useTextEntryDragLock(grid_ref);
  // A freshly created row opens with its placeholder name selected, so typing replaces it.
  useEffect(() => {
    if (is_editing && state.edit_select_all) name_input_ref.current?.select();
  }, [is_editing, state.edit_select_all]);
  useEffect(() => {
    const clear = () => { fill_handle_mousedown_ref.current = false; };
    window.addEventListener("mouseup", clear);
    return () => window.removeEventListener("mouseup", clear);
  }, []);

  return (
    <div
      className="relative flex items-stretch"
      style={{ minWidth: min_width }}
      onMouseEnter={() => actions.setHoverRow(sub.id)}
      onMouseLeave={() => actions.setHoverRow(null)}
    >
      {!state.read_only && (
        <div className="absolute -left-[27px] top-2 z-[120]">
          <button
            ref={menu_btn_ref}
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.openRowMenu(sub.id); }}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover-strong hover:text-boardtree-accent"
            style={{ background: is_row_menu_open ? "var(--color-boardtree-hover-strong)" : "transparent", opacity: is_hovered || is_row_menu_open ? 1 : 0, pointerEvents: is_hovered || is_row_menu_open ? "auto" : "none" }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
          </button>
          {is_row_menu_open && (
            <RowMenu
              is_sub
              anchor_el={menu_btn_ref.current}
              move_targets={move_targets}
              convert_targets={[]}
              copied={state.copied_row_id === sub.id}
              is_priority={!!sub.is_priority}
              onOpen={() => actions.openItem(sub.id)}
              onOpenInNewTab={() => actions.openRowInNewTab(sub.id)}
              onCopyLink={() => actions.copyRowLink(sub.id)}
              onCreateBelow={() => actions.createBelow(sub.id)}
              onAddSubitem={() => {}}
              onDuplicate={(with_subs) => actions.duplicateNode(sub.id, with_subs)}
              onMoveTo={(target_id) => actions.moveSubToItem(sub.id, target_id)}
              onConvertToItem={() => actions.convertSubToItem(sub.id)}
              onConvertToSubOf={() => {}}
              onTogglePriority={() => actions.toggleNodePriority(sub.id)}
              onOpenIntegrations={row_apps.has_integrations ? () => actions.openRowApp("integrations") : undefined}
              onOpenAutomations={row_apps.has_automations ? () => actions.openRowApp("automations") : undefined}
              onArchive={() => actions.archiveNode(sub.id)}
              onDelete={() => actions.deleteNode(sub.id)}
              onClose={actions.closeRowMenu}
            />
          )}
        </div>
      )}

      <TreeBar variant="thin" color={group.color} />
      <TreeHook color={group.color} />
      <TreeBar variant="thick" color={group.color} />

      <div
        ref={grid_ref}
        className="flex-1 border-r border-b border-boardtree-grid"
        style={{ display: "grid", gridTemplateColumns: sub_tpl, background: row_bg, opacity: is_dragging ? 0.45 : 1 }}
        // See `ItemRow`: no row drag while a text field in it is being edited.
        draggable={!state.read_only && !is_editing && !is_text_entry_focused}
        {...lock_handlers}
        onDragStart={(e) => {
          if (shouldCancelDrag(e)) return;
          if (fill_handle_mousedown_ref.current) {
            e.preventDefault();
            return;
          }
          actions.onDragStart(sub.id, item.id);
        }}
        onDragOver={(e) => { e.preventDefault(); actions.onDragOver(sub.id, item.id); }}
        onDragEnd={actions.onDragEnd}
      >
        <div className="flex items-center justify-center border-r border-boardtree-grid" style={{ height: row_h, position: "sticky", left: sticky_offsets[0], zIndex: 15, background: row_bg }}>
          <button type="button" onClick={() => actions.toggleSelected(sub.id)} className="flex items-center justify-center">
            {is_selected ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-boardtree-accent">
                <svg viewBox="0 0 14 14" width="9" height="9"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </span>
            ) : (
              <span className="h-4 w-4 rounded-[4px] border border-boardtree-control-border bg-boardtree-surface hover:border-boardtree-accent" />
            )}
          </button>
        </div>

        <div
          className="item-name-cell flex items-center gap-1.5 border-r border-boardtree-grid pl-2 pr-1.5"
          data-draggable={!state.read_only && !is_editing}
          style={{
            height: row_h,
            position: "sticky",
            left: sticky_offsets[1],
            zIndex: is_editing ? 16 : 15,
            background: is_editing ? "var(--color-boardtree-surface)" : row_bg,
            outline: is_editing ? "1px solid var(--color-boardtree-accent)" : undefined,
            outlineOffset: is_editing ? "-1px" : undefined,
          }}
        >
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
                  className="h-[28px] w-full min-w-0 border-0 bg-transparent py-0 pl-1.5 pr-6 text-board-cell text-boardtree-text outline-none"
                />
                <EmojiInsertButton
                  input_ref={name_input_ref}
                  value={state.edit_draft}
                  onChange={actions.updateEditDraft}
                  onOpenChange={(is_open) => { is_emoji_palette_open_ref.current = is_open; }}
                  size={12}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                />
              </span>
            ) : (
              <span onClick={() => actions.startEditName(sub.id, sub.name)} className="item-name-cell__label max-w-full truncate px-1.5 py-0.5 text-board-cell text-boardtree-text">
                {highlightSearchMatches(sub.name, state.search_query)}
              </span>
            )}
          </div>
          {/* See `ItemRow`: the hover icons step aside while editing and only take width while they show. */}
          {!is_editing && (
            <>
              {(is_hovered || sub.is_priority) && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); actions.toggleNodePriority(sub.id); }}
                  title={sub.is_priority ? "Unmark as priority" : "Mark as priority, this task sorts above the rest"}
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px] hover:bg-boardtree-hover-strong"
                  style={{ color: sub.is_priority ? "#fdab3d" : "var(--color-boardtree-text-faint)" }}
                >
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path
                      d="M8 1.7 l1.8 3.9 4.3 .5 -3.2 2.9 .9 4.2 -3.8 -2.2 -3.8 2.2 .9 -4.2 -3.2 -2.9 4.3 -.5z"
                      fill={sub.is_priority ? "currentColor" : "none"}
                      stroke={sub.is_priority ? "none" : "currentColor"}
                      strokeWidth={sub.is_priority ? undefined : "1.2"}
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center border-r border-boardtree-grid" style={{ height: row_h, position: "sticky", left: sticky_offsets[2], zIndex: 15, background: row_bg }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.openComments(sub.id); }}
            className="relative flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-accent"
          >
            <svg viewBox="0 0 18 18" width="16" height="16"><path d="M2.2 8.1 a6.4 5.4 0 1 1 3.4 4.8 L2.4 13.9 l1 -3 a5.2 5.2 0 0 1 -1.2 -2.8 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M9 5.9 V10.1 M6.9 8 H11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            {!!sub.comment_count && (
              <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-boardtree-accent px-[3px] text-[9px] font-bold leading-none text-white">
                {sub.comment_count > 99 ? "99+" : sub.comment_count}
              </span>
            )}
          </button>
        </div>

        {group.sub_base_columns.concat(group.sub_custom_columns).map((col) => {
          const is_active = state.active_cell?.node_id === sub.id && state.active_cell?.column_id === col.id;
          const is_fill_target =
            !!state.fill_drag &&
            state.fill_drag.column_id === col.id &&
            state.fill_drag.hovered_node_id === sub.id &&
            state.fill_drag.anchor_node_id !== sub.id;
          const is_invalid = !is_active && !is_fill_target && isValueInvalid(col, sub.values[col.id]);
          return (
            <div
              key={col.id}
              data-column-move={columnMoveKey("sub", col.id)}
              className="relative flex min-w-0 items-stretch border-r border-boardtree-grid"
              title={is_invalid ? "This column requires a valid value" : undefined}
              style={{
                height: row_h,
                // See `ItemRow`'s identical cell wrapper for why this is an
                // `outline`, not a `box-shadow`.
                outline: is_active
                  ? "2px solid var(--color-boardtree-accent)"
                  : is_fill_target
                    ? "1.5px dashed var(--color-boardtree-accent)"
                    : is_invalid
                      ? "1.5px solid #e2445c"
                      : undefined,
                outlineOffset: is_active || is_fill_target || is_invalid ? "-2px" : undefined,
                zIndex: is_active ? 5 : undefined,
              }}
              onMouseDown={() => actions.setActiveCell(sub.id, col.id)}
              onMouseEnter={() => {
                if (state.fill_drag?.column_id === col.id) actions.updateFillDragHover(sub.id);
              }}
            >
              <CellRenderer node_id={sub.id} column={col} values={sub.values} node_name={sub.name} state={state} actions={actions} group_color={group.color} />
              {is_active && (
                <div
                  data-fill-handle="true"
                  draggable={false}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    fill_handle_mousedown_ref.current = true;
                    actions.startFillDrag(sub.id, col.id);
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
