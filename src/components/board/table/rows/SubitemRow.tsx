"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup, BoardTableItem, BoardTableNode } from "../types";
import { subGridTemplate } from "../layoutUtils";
import CellRenderer from "../cells/CellRenderer";
import RowMenu, { type RowMenuTarget } from "../menus/RowMenu";
import TreeBar from "./TreeBar";
import TreeHook from "./TreeHook";

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

  const move_targets: RowMenuTarget[] = state.groups.flatMap((g) => g.items.map((it) => ({ id: it.id, label: it.name, current: it.id === item.id })));
  const sub_tpl = subGridTemplate(name_col_width, group.sub_base_columns, group.sub_custom_columns);

  return (
    <div
      className="relative flex items-stretch"
      style={{ minWidth: min_width }}
      onMouseEnter={() => actions.setHoverRow(sub.id)}
      onMouseLeave={() => actions.setHoverRow(null)}
    >
      <div className="absolute -left-[27px] top-2 z-[120]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); actions.openRowMenu(sub.id); }}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#6b7189] hover:bg-[#dfe4f6] hover:text-[#4f6bed]"
          style={{ background: is_row_menu_open ? "#dfe4f6" : "transparent", opacity: is_hovered || is_row_menu_open ? 1 : 0, pointerEvents: is_hovered || is_row_menu_open ? "auto" : "none" }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
        </button>
        {is_row_menu_open && (
          <RowMenu
            is_sub
            panel_style={{ top: 28 }}
            move_targets={move_targets}
            convert_targets={[]}
            copied={state.copied_row_id === sub.id}
            onOpen={() => {}}
            onCopyLink={() => actions.copyRowLink(sub.id)}
            onCreateBelow={() => actions.createBelow(sub.id)}
            onAddSubitem={() => {}}
            onDuplicate={(with_subs) => actions.duplicateNode(sub.id, with_subs)}
            onMoveTo={(target_id) => actions.convertItemToSub(sub.id, target_id)}
            onConvertToItem={() => actions.convertSubToItem(sub.id)}
            onConvertToSubOf={() => {}}
            onArchive={() => actions.deleteNode(sub.id)}
            onDelete={() => actions.deleteNode(sub.id)}
            onClose={actions.closeRowMenu}
          />
        )}
      </div>

      <TreeBar variant="thin" color={group.color} />
      <TreeHook color={group.color} />
      <TreeBar variant="thick" color={group.color} />

      <div
        className="flex-1 border-r border-b border-[#eef0f7]"
        style={{ display: "grid", gridTemplateColumns: sub_tpl, background: is_selected ? "#eaf0ff" : "#ffffff", opacity: is_dragging ? 0.45 : 1 }}
        draggable
        onDragStart={() => actions.onDragStart(sub.id, item.id)}
        onDragOver={(e) => { e.preventDefault(); actions.onDragOver(sub.id, item.id); }}
        onDragEnd={actions.onDragEnd}
      >
        <div className="flex h-10 items-center justify-center border-r border-[#eef0f7]">
          <button type="button" onClick={() => actions.toggleSelected(sub.id)} className="flex items-center justify-center">
            {is_selected ? (
              <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[3px] bg-[#4f6bed]">
                <svg viewBox="0 0 14 14" width="9" height="9"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </span>
            ) : (
              <span className="h-[14px] w-[14px] rounded-[3px] border-[1.5px] border-[#ccd1de] bg-white hover:border-[#4f6bed]" />
            )}
          </button>
        </div>

        <div className="relative flex h-10 items-center gap-1.5 border-r border-[#eef0f7] pl-2 pr-3">
          <div className="flex w-[11px] flex-none cursor-grab items-center text-[#d6dae6]">
            <svg viewBox="0 0 6 14" width="6" height="11"><circle cx="1.5" cy="3" r="1" fill="currentColor" /><circle cx="4.5" cy="3" r="1" fill="currentColor" /><circle cx="1.5" cy="7" r="1" fill="currentColor" /><circle cx="4.5" cy="7" r="1" fill="currentColor" /><circle cx="1.5" cy="11" r="1" fill="currentColor" /><circle cx="4.5" cy="11" r="1" fill="currentColor" /></svg>
          </div>
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
              className="absolute left-0 top-0 h-full w-full border-2 border-[#4f6bed] px-3 pl-[25px] text-[13px] text-[#262b45] outline-none"
            />
          ) : (
            <div className="flex min-w-0 flex-1 items-center">
              <span onClick={() => actions.startEditName(sub.id, sub.name)} className="max-w-full cursor-text truncate rounded-[4px] px-1.5 py-1 text-[13px] text-[#262b45]">
                {sub.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex h-10 items-center justify-center border-r border-[#eef0f7]">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[#a4aac2] hover:bg-[#eef1f9] hover:text-[#4f6bed]">
            <svg viewBox="0 0 18 18" width="16" height="16"><path d="M2.2 8.1 a6.4 5.4 0 1 1 3.4 4.8 L2.4 13.9 l1 -3 a5.2 5.2 0 0 1 -1.2 -2.8 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M9 5.9 V10.1 M6.9 8 H11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </div>
        </div>

        {group.sub_base_columns.concat(group.sub_custom_columns).map((col) => (
          <div key={col.id} className="relative flex h-10 items-stretch border-r border-[#eef0f7]">
            <CellRenderer node_id={sub.id} column={col} values={sub.values} state={state} actions={actions} />
          </div>
        ))}

        <div className="h-10" />
        <div className="h-10" />
      </div>
    </div>
  );
}
