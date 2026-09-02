"use client";

import type { TaskBoardActions, TaskBoardState } from "../../_hooks/useTaskBoard";
import type { TaskBoardGroup, TaskBoardItem } from "../../_types/board.types";
import { mainGridTemplate } from "../../_lib/layout_utils";
import CellRenderer from "../cells/CellRenderer";
import RowMenu, { type RowMenuTarget } from "../menus/RowMenu";
import TreeBar from "./TreeBar";

interface ItemRowProps {
  item: TaskBoardItem;
  group: TaskBoardGroup;
  name_col_width: number;
  min_width: number;
  state: TaskBoardState;
  actions: TaskBoardActions;
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

  return (
    <div
      className="relative flex items-stretch"
      style={{ minWidth: min_width, background: is_selected ? "#eaf0ff" : "#ffffff", opacity: is_dragging ? 0.45 : 1 }}
      draggable
      onDragStart={() => actions.onDragStart(item.id, "ROOT")}
      onDragOver={(e) => { e.preventDefault(); actions.onDragOver(item.id, "ROOT"); }}
      onDragEnd={actions.onDragEnd}
      onMouseEnter={() => actions.setHoverRow(item.id)}
      onMouseLeave={() => actions.setHoverRow(null)}
    >
      <div className="absolute -left-[27px] top-2 z-[120]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); actions.openRowMenu(item.id); }}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#6b7189] hover:bg-[#dfe4f6] hover:text-[#4f6bed]"
          style={{ background: is_row_menu_open ? "#dfe4f6" : "transparent", opacity: is_hovered || is_row_menu_open ? 1 : 0, pointerEvents: is_hovered || is_row_menu_open ? "auto" : "none" }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
        </button>
        {is_row_menu_open && (
          <RowMenu
            is_sub={false}
            panel_style={{ top: 28 }}
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

      <div className="flex-1 border-b border-[#eceef5]" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
          <button type="button" onClick={() => actions.toggleSelected(item.id)} className="flex items-center justify-center">
            {is_selected ? (
              <span className="flex h-[15px] w-[15px] items-center justify-center rounded-[3px] bg-[#4f6bed]">
                <svg viewBox="0 0 14 14" width="10" height="10"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </span>
            ) : (
              <span className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-[#c6cbd8] bg-white hover:border-[#4f6bed]" />
            )}
          </button>
        </div>

        <div className="relative flex h-[42px] items-center gap-2 border-r border-[#eceef5] pl-1 pr-3">
          <div className="flex w-3 flex-none cursor-grab items-center justify-center text-[#cfd4e2]">
            <svg viewBox="0 0 6 14" width="6" height="12"><circle cx="1.5" cy="3" r="1.1" fill="currentColor" /><circle cx="4.5" cy="3" r="1.1" fill="currentColor" /><circle cx="1.5" cy="7" r="1.1" fill="currentColor" /><circle cx="4.5" cy="7" r="1.1" fill="currentColor" /><circle cx="1.5" cy="11" r="1.1" fill="currentColor" /><circle cx="4.5" cy="11" r="1.1" fill="currentColor" /></svg>
          </div>
          <button type="button" onClick={() => actions.toggleItemOpen(item.id)} className="flex h-5 w-5 flex-none items-center justify-center rounded-[4px] text-[#6b7189] hover:bg-[#eef1f9] hover:text-[#1e2237]">
            {is_open ? (
              <svg viewBox="0 0 12 12" width="11" height="11"><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            ) : (
              <svg viewBox="0 0 12 12" width="11" height="11"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            )}
          </button>
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
              className="absolute left-0 top-0 h-full w-full border-2 border-[#4f6bed] px-3 pl-10 text-[13.5px] font-medium text-[#1e2237] outline-none"
            />
          ) : (
            <div className="flex min-w-0 flex-1 items-center">
              <span onClick={() => actions.startEditName(item.id, item.name)} className="max-w-full cursor-text truncate rounded-[4px] px-1.5 py-1 text-[13px] text-[#262b45]">
                {item.name}
              </span>
            </div>
          )}
          {item.subs.length > 0 && (
            <button type="button" onClick={() => actions.toggleItemOpen(item.id)} className="flex-none rounded-[9px] bg-[#eef1f9] px-[7px] py-0.5 font-mono text-[10.5px] text-[#5b6180]">
              {item.subs.length}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.addSubitem(item.id); }}
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[#a4aac2] hover:bg-[#eef1f9] hover:text-[#4f6bed]"
          >
            <svg viewBox="0 0 14 14" width="13" height="13"><circle cx="7" cy="7" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4.6 V9.4 M4.6 7 H9.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[#a4aac2] hover:bg-[#eef1f9] hover:text-[#4f6bed]">
            <svg viewBox="0 0 18 18" width="16" height="16"><path d="M2.2 8.1 a6.4 5.4 0 1 1 3.4 4.8 L2.4 13.9 l1 -3 a5.2 5.2 0 0 1 -1.2 -2.8 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M9 5.9 V10.1 M6.9 8 H11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </div>
        </div>

        {group.base_columns.concat(group.custom_columns).map((col) => (
          <div key={col.id} className="relative flex h-[42px] items-stretch border-r border-[#eceef5]">
            <CellRenderer node_id={item.id} column={col} values={item.values} state={state} actions={actions} />
          </div>
        ))}

        <div className="h-[42px]" />
        <div className="h-[42px]" />
      </div>
    </div>
  );
}
