"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import GroupMenu from "../menus/GroupMenu";

interface GroupHeaderBarProps {
  group: BoardTableGroup;
  group_index: number;
  group_count: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

export default function GroupHeaderBar({ group, group_index, group_count, min_width, state, actions }: GroupHeaderBarProps) {
  const is_collapsed = !!state.collapsed_groups[group.key];
  const is_hovered = state.hover_group_key === group.key;
  const is_menu_open = state.open_group_menu_key === group.key;
  const is_editing = state.editing_group_key === group.key;
  const sub_count = group.items.reduce((a, it) => a + it.subs.length, 0);

  return (
    <div className="sticky top-0 z-[60] flex h-10 items-end bg-[#f4f6fb] pb-2" style={{ minWidth: min_width, zIndex: is_menu_open ? 200 : 60 }}>
      <div
        onMouseEnter={() => actions.setHoverGroup(group.key)}
        onMouseLeave={() => actions.setHoverGroup(null)}
        className="sticky left-0 flex w-max items-center gap-2"
      >
        <div className="relative -ml-[27px] flex-none">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); actions.openGroupMenu(group.key); }}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#6b7189] hover:bg-[#e6eaf6]"
            style={{ background: is_menu_open ? "#dfe4f6" : "transparent", opacity: is_hovered || is_menu_open ? 1 : 0, pointerEvents: is_hovered || is_menu_open ? "auto" : "none" }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
          </button>
          {is_menu_open && (
            <GroupMenu
              panel_style={{ top: 28 }}
              is_collapsed={is_collapsed}
              is_first={group_index === 0}
              is_last={group_index === group_count - 1}
              current_color={group.color}
              onExpandThis={() => actions.toggleGroupCollapsed(group.key)}
              onExpandAllGroups={actions.expandAllGroups}
              onSelectAll={() => actions.selectAllInGroup(group.key)}
              onExpandSubitems={() => actions.setAllSubsOpen(group.key, true)}
              onCollapseSubitems={() => actions.setAllSubsOpen(group.key, false)}
              onAddGroup={actions.addGroup}
              onDuplicate={(with_items) => actions.duplicateGroup(group.key, with_items)}
              onMove={(dir) => actions.moveGroupByKey(group.key, dir)}
              onRename={() => actions.startGroupRename(group.key, group.title)}
              onChangeColor={(color) => actions.setGroupColor(group.key, color)}
              onDelete={() => actions.removeGroup(group.key)}
              onArchive={() => actions.removeGroup(group.key)}
              onClose={actions.closeGroupMenu}
            />
          )}
        </div>

        <button type="button" onClick={() => actions.toggleGroupCollapsed(group.key)} className="flex items-center" style={{ color: group.color, transform: is_collapsed ? "rotate(-90deg)" : "none" }}>
          <svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>

        {is_editing ? (
          <input
            autoFocus
            value={state.group_draft}
            onChange={(e) => actions.updateGroupDraft(e.target.value)}
            onBlur={actions.commitGroupRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") actions.cancelGroupRename();
            }}
            className="min-w-[180px] rounded-[4px] border border-[#4f6bed] bg-white px-1.5 py-px text-[16px] font-semibold outline-none"
            style={{ color: group.color }}
          />
        ) : (
          <button
            type="button"
            onClick={() => actions.startGroupRename(group.key, group.title)}
            title="Click to rename"
            className="-mx-1.5 cursor-text rounded-[4px] border border-transparent px-1.5 py-px text-[16px] font-semibold hover:border-[#d7dbe8] hover:bg-white"
            style={{ color: group.color }}
          >
            {group.title}
          </button>
        )}
        <div className="font-mono text-[11px] text-[#9aa0b6]">
          {group.items.length} items{sub_count ? ` · ${sub_count} subitems` : ""}
        </div>
      </div>
    </div>
  );
}
