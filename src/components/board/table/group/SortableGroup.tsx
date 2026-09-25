"use client";

import type React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * What a group header needs to act as the drag handle of its group. Pointer
 * listeners go on the whole title cluster (a plain click still renames or
 * collapses, the drag only starts after the pointer moves a few pixels),
 * while the keyboard listener and ARIA attributes go on the grip button
 * alone, so Enter or Space on the title or the collapse arrow keep their
 * own meaning.
 */
export interface GroupDragHandle {
  is_enabled: boolean;
  pointer_listeners: Record<string, (event: never) => void>;
  grip_props: React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  setGripRef: (element: HTMLElement | null) => void;
}

interface SortableGroupProps {
  group_key: string;
  is_enabled: boolean;
  children: (drag_handle: GroupDragHandle, is_dragging: boolean) => React.ReactNode;
}

/** Makes one group (table) of the board sortable by dragging its header. */
export default function SortableGroup({ group_key, is_enabled, children }: SortableGroupProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: group_key,
    disabled: !is_enabled,
  });

  const { onKeyDown, ...pointer_listeners } = (listeners ?? {}) as Record<string, (event: never) => void>;
  const drag_handle: GroupDragHandle = {
    is_enabled,
    pointer_listeners: is_enabled ? pointer_listeners : {},
    grip_props: is_enabled ? { ...attributes, onKeyDown: onKeyDown as React.KeyboardEventHandler<HTMLElement> } : {},
    setGripRef: setActivatorNodeRef,
  };

  return (
    <div
      ref={setNodeRef}
      data-group-key={group_key}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : undefined,
      }}
    >
      {children(drag_handle, isDragging)}
    </div>
  );
}
