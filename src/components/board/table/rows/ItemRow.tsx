"use client";

import { useRef } from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup, BoardTableItem } from "../types";
import { mainGridTemplate } from "../layoutUtils";
import CellRenderer from "../cells/CellRenderer";
import RowMenu, { type RowMenuTarget } from "../menus/RowMenu";
import TreeBar from "./TreeBar";

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

  const move_targets: RowMenuTarget[] = state.groups.map((g) => ({ id: g.key, label: g.title, current: g.key === group.key }));
  const convert_targets: RowMenuTarget[] = state.groups.flatMap((g) => g.items.filter((it) => it.id !== item.id).map((it) => ({ id: it.id, label: it.name })));

  const main_tpl = mainGridTemplate(name_col_width, group.base_columns, group.custom_columns);
  const menu_btn_ref = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="relative flex items-stretch"
      style={{ minWidth: min_width, background: is_selected ? "var(--color-boardtree-selected)" : "var(--color-boardtree-surface)", opacity: is_dragging ? 0.45 : 1 }}
      draggable
      onDragStart={() => actions.onDragStart(item.id, "ROOT")}
      onDragOver={(e) => { e.preventDefault(); actions.onDragOver(item.id, "ROOT"); }}
      onDragEnd={actions.onDragEnd}
      onMouseEnter={() => actions.setHoverRow(item.id)}
      onMouseLeave={() => actions.setHoverRow(null)}
    >
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
            onCopyLink={() => actions.copyRowLink(item.id)}
            onCreateBelow={() => actions.createBelow(item.id)}
            onAddSubitem={() => actions.addSubitem(item.id)}
            onDuplicate={(with_subs) => actions.duplicateNode(item.id, with_subs)}
            onMoveTo={(target_id) => actions.moveItemToGroup(item.id, target_id)}
            onConvertToItem={() => {}}
            onConvertToSubOf={(target_id) => actions.convertItemToSub(item.id, target_id)}
            onArchive={() => actions.deleteNode(item.id)}
            onDelete={() => actions.deleteNode(item.id)}
            onClose={actions.closeRowMenu}
          />
        )}
      </div>

      <TreeBar variant="thick" color={group.color} />

      <div className="flex-1 border-b border-boardtree-border-soft" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="flex h-[42px] items-center justify-center border-r border-boardtree-border-soft">
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

        <div className="flex h-[42px] items-center gap-2 border-r border-boardtree-border-soft pl-1 pr-3">
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
              <input
                autoFocus
                value={state.edit_draft}
                onChange={(e) => actions.updateEditDraft(e.target.value)}
                onBlur={actions.commitEditName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") actions.cancelEditName();
                }}
                className="h-[34px] w-full min-w-0 rounded-[4px] border-2 border-boardtree-accent bg-boardtree-surface px-1.5 text-[13.5px] font-medium text-boardtree-text outline-none"
              />
            ) : (
              <span onClick={() => actions.startEditName(item.id, item.name)} className="max-w-full cursor-text truncate rounded-[4px] px-1.5 py-1 text-[13px] text-boardtree-text">
                {item.name}
              </span>
            )}
          </div>
          {item.subs.length > 0 && (
            <button type="button" onClick={() => actions.toggleItemOpen(item.id)} className="flex-none rounded-[9px] bg-boardtree-hover px-[7px] py-0.5 font-mono text-[10.5px] text-boardtree-text-secondary">
              {item.subs.length}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.addSubitem(item.id); }}
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-accent"
          >
            <svg viewBox="0 0 14 14" width="13" height="13"><circle cx="7" cy="7" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4.6 V9.4 M4.6 7 H9.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex h-[42px] items-center justify-center border-r border-boardtree-border-soft">
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

        {group.base_columns.concat(group.custom_columns).map((col) => (
          <div key={col.id} className="relative flex h-[42px] items-stretch border-r border-boardtree-border-soft">
            <CellRenderer node_id={item.id} column={col} values={item.values} state={state} actions={actions} />
          </div>
        ))}

        <div className="h-[42px]" />
        <div className="h-[42px]" />
      </div>
    </div>
  );
}
