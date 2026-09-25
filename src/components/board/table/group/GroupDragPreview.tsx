"use client";

import type { BoardTableGroup } from "../types";

interface GroupDragPreviewProps {
  group: BoardTableGroup;
  /** The floating copy that follows the pointer gets a shadow, the rows left in the list do not. */
  is_overlay?: boolean;
}

/**
 * The compact bar every group turns into while a group is being dragged,
 * like monday.com collapsing all groups so they are easy to reorder.
 */
export default function GroupDragPreview({ group, is_overlay = false }: GroupDragPreviewProps) {
  const item_count = group.is_items_loaded === false ? group.item_count ?? 0 : group.items.length;

  return (
    <div
      className={`flex h-10 w-[min(520px,100%)] items-center gap-2.5 overflow-hidden rounded-[8px] border border-boardtree-border bg-boardtree-surface pr-3 ${
        is_overlay ? "cursor-grabbing shadow-[0_8px_24px_rgba(0,0,0,0.18)]" : ""
      }`}
    >
      <div className="h-full w-[5px] flex-none" style={{ background: group.color }} />
      <svg viewBox="0 0 6 14" width="6" height="12" className="flex-none text-boardtree-text-faint" aria-hidden>
        <circle cx="1.5" cy="3" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="3" r="1.1" fill="currentColor" />
        <circle cx="1.5" cy="7" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="7" r="1.1" fill="currentColor" />
        <circle cx="1.5" cy="11" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="11" r="1.1" fill="currentColor" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: group.color }}>
        {group.title}
      </span>
      <span className="flex-none font-mono text-[11px] text-boardtree-text-faint">
        {item_count} {item_count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}
