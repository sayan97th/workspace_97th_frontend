"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import GroupHeaderLeft from "./GroupHeaderLeft";
import { groupDragHandleClassName, useGroupDragHandle } from "./groupDragHandle";

interface GroupHeaderBarProps {
  group: BoardTableGroup;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

export default function GroupHeaderBar({ group, min_width, state, actions }: GroupHeaderBarProps) {
  const is_menu_open = state.open_group_menu_key === group.key;
  // The whole header strip is the grab area for reordering tables, see `SortableGroupList`.
  const drag_handle = useGroupDragHandle();

  return (
    <div
      data-group-anchor
      {...drag_handle.listeners}
      className={`sticky top-0 z-[60] flex h-10 items-end bg-boardtree-bg pb-2 ${groupDragHandleClassName(drag_handle)}`}
      style={{ minWidth: min_width, zIndex: is_menu_open ? 200 : 60 }}
    >
      <GroupHeaderLeft group={group} state={state} actions={actions} />
    </div>
  );
}
