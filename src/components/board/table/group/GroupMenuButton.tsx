"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import GroupMenu from "../menus/GroupMenu";

interface GroupMenuButtonProps {
  group: BoardTableGroup;
  group_index: number;
  group_count: number;
  state: BoardTableState;
  actions: BoardTableActions;
  is_visible: boolean;
  className?: string;
  panel_style?: React.CSSProperties;
}

/** The group's "..." menu trigger and its popover panel. Shared by the expanded group
 *  header (`GroupHeaderLeft`, rendered inline) and the collapsed group's summary card
 *  (`CollapsedGroupSummaryRow`, rendered outside the card so the popover isn't clipped
 *  by the card's `overflow-hidden` border). */
export default function GroupMenuButton({ group, group_index, group_count, state, actions, is_visible, className = "", panel_style }: GroupMenuButtonProps) {
  const is_collapsed = !!state.collapsed_groups[group.key];
  const is_menu_open = state.open_group_menu_key === group.key;

  return (
    <div className={`relative flex-none ${className}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); actions.openGroupMenu(group.key); }}
        className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover-strong"
        style={{ background: is_menu_open ? "var(--color-boardtree-hover-strong)" : "transparent", opacity: is_visible || is_menu_open ? 1 : 0, pointerEvents: is_visible || is_menu_open ? "auto" : "none" }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
      </button>
      {is_menu_open && (
        <GroupMenu
          panel_style={panel_style ?? { top: 28 }}
          is_collapsed={is_collapsed}
          is_first={group_index === 0}
          is_last={group_index === group_count - 1}
          current_color={group.color}
          is_priority={group.is_priority}
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
          onTogglePriority={() => actions.togglePriority(group.key)}
          onDelete={() => actions.removeGroup(group.key)}
          onArchive={() => actions.removeGroup(group.key)}
          onClose={actions.closeGroupMenu}
        />
      )}
    </div>
  );
}
