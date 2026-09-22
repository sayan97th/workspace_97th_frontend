"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import GroupHeaderLeft from "./GroupHeaderLeft";

interface GroupHeaderBarProps {
  group: BoardTableGroup;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

export default function GroupHeaderBar({ group, min_width, state, actions }: GroupHeaderBarProps) {
  const is_menu_open = state.open_group_menu_key === group.key;

  return (
    <div className="sticky top-0 z-[60] flex h-10 items-end bg-boardtree-bg pb-2" style={{ minWidth: min_width, zIndex: is_menu_open ? 200 : 60 }}>
      <GroupHeaderLeft group={group} state={state} actions={actions} />
    </div>
  );
}
