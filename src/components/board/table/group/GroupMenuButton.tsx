"use client";

import { useRef } from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import GroupMenu from "../menus/GroupMenu";

interface GroupMenuButtonProps {
  group: BoardTableGroup;
  state: BoardTableState;
  actions: BoardTableActions;
  is_visible: boolean;
  className?: string;
}

/** The group's "..." menu trigger and its menu. Shared by the expanded group header
 *  (`GroupHeaderLeft`, rendered inline) and the collapsed group's summary card
 *  (`CollapsedGroupSummaryRow`). The menu is portaled and anchored to the trigger, so
 *  neither the card's `overflow-hidden` border nor the table's scroll area clips it. */
export default function GroupMenuButton({ group, state, actions, is_visible, className = "" }: GroupMenuButtonProps) {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const is_collapsed = !!state.collapsed_groups[group.key];
  const are_all_collapsed = state.groups.length > 0 && state.groups.every((g) => !!state.collapsed_groups[g.key]);
  const row_apps = actions.getRowApps();
  const is_menu_open = state.open_group_menu_key === group.key;
  // Priority client groups always render above the rest (see `deriveBoardRows`), so a
  // group can only move within its own tier: "first" and "last" mean first and last of it.
  const tier = state.groups.filter((g) => !!g.is_priority === !!group.is_priority);
  const tier_index = tier.findIndex((g) => g.key === group.key);

  return (
    <div data-no-group-drag className={`relative flex-none ${className}`}>
      <button
        ref={trigger_ref}
        type="button"
        aria-label="Group actions"
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        title="Group actions"
        onClick={(e) => {
          e.stopPropagation();
          if (is_menu_open) actions.closeGroupMenu();
          else actions.openGroupMenu(group.key);
        }}
        data-open={is_menu_open || undefined}
        className="group-menu-trigger flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover-strong"
        style={{ opacity: is_visible || is_menu_open ? 1 : 0, pointerEvents: is_visible || is_menu_open ? "auto" : "none" }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
      </button>
      {is_menu_open && (
        <GroupMenu
          anchor_el={trigger_ref.current}
          is_collapsed={is_collapsed}
          are_all_collapsed={are_all_collapsed}
          is_first={tier_index <= 0}
          is_last={tier_index === tier.length - 1}
          current_color={group.color}
          is_priority={group.is_priority}
          onToggleThis={() => actions.toggleGroupCollapsed(group.key)}
          onToggleAllGroups={are_all_collapsed ? actions.expandAllGroups : actions.collapseAllGroups}
          onSelectAll={() => actions.selectAllInGroup(group.key)}
          onExpandSubitems={() => actions.setAllSubsOpen(group.key, true)}
          onCollapseSubitems={() => actions.setAllSubsOpen(group.key, false)}
          onAddGroup={() => actions.addGroup(group.key)}
          onDuplicate={(with_items) => actions.duplicateGroup(group.key, with_items)}
          onMove={(dir) => actions.moveGroupByKey(group.key, dir)}
          onRename={() => actions.startGroupRename(group.key, group.title)}
          onChangeColor={(color) => actions.setGroupColor(group.key, color)}
          onTogglePriority={() => actions.togglePriority(group.key)}
          onExportExcel={actions.canExportGroup() ? () => actions.exportGroup(group.key) : undefined}
          onOpenIntegrations={row_apps.has_integrations ? () => actions.openRowApp("integrations") : undefined}
          onOpenAutomations={row_apps.has_automations ? () => actions.openRowApp("automations") : undefined}
          onDelete={() => actions.removeGroup(group.key)}
          onArchive={() => actions.archiveGroup(group.key)}
          onClose={actions.closeGroupMenu}
        />
      )}
    </div>
  );
}
