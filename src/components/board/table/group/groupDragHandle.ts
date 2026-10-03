"use client";

import { createContext, useContext } from "react";
import type React from "react";

/**
 * What a group's header needs to start dragging the whole group, handed down by
 * `SortableGroupList` so `GroupHeaderBar` and `CollapsedGroupSummaryRow` can be the
 * grab area without threading drag props through `GroupSection`.
 */
export interface GroupDragHandle {
  is_enabled: boolean;
  /** Mouse and touch listeners to spread on the grab area. Undefined while dragging is off. */
  listeners?: Record<string, (event: React.SyntheticEvent) => void>;
}

const GroupDragHandleContext = createContext<GroupDragHandle>({ is_enabled: false });

export const GroupDragHandleProvider = GroupDragHandleContext.Provider;

/** The current group's drag handle, disabled outside a `SortableGroupList` (the drag preview, other views). */
export function useGroupDragHandle(): GroupDragHandle {
  return useContext(GroupDragHandleContext);
}

/** Presses inside these never pick the group up, so typing a new title or using a menu keeps working. */
export const NO_GROUP_DRAG_SELECTOR = "input, textarea, select, [contenteditable='true'], [data-no-group-drag]";

/** Class for an element that carries `listeners`: grab cursor, no text selection while dragging. */
export function groupDragHandleClassName(handle: GroupDragHandle): string {
  return handle.is_enabled ? "cursor-grab select-none" : "";
}
