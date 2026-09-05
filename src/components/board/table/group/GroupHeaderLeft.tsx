"use client";

import { useRef } from "react";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import GroupMenuButton from "./GroupMenuButton";
import EmojiInsertButton from "../../EmojiInsertButton";

interface GroupHeaderLeftProps {
  group: BoardTableGroup;
  group_index: number;
  group_count: number;
  state: BoardTableState;
  actions: BoardTableActions;
  /** Set to false when the caller renders the "..." menu button itself (e.g. the collapsed
   *  group's summary card renders it outside its `overflow-hidden` card). Defaults to true. */
  show_menu_button?: boolean;
}

/** The interactive left-hand cluster shared by the expanded group header (`GroupHeaderBar`)
 *  and the collapsed group's summary card (`CollapsedGroupSummaryRow`): group menu, collapse
 *  toggle, editable title, item/subitem count, and the priority-client flag. */
export default function GroupHeaderLeft({ group, group_index, group_count, state, actions, show_menu_button = true }: GroupHeaderLeftProps) {
  const is_collapsed = !!state.collapsed_groups[group.key];
  const is_hovered = state.hover_group_key === group.key;
  const is_editing = state.editing_group_key === group.key;
  const sub_count = group.items.reduce((a, it) => a + it.subs.length, 0);
  const title_input_ref = useRef<HTMLInputElement>(null);
  // Picking an emoji blurs the title input (the picker's grid is a portaled
  // element outside it), which would otherwise reach `onBlur` before the
  // pick's own text update lands and commit the rename out from under it.
  const is_emoji_palette_open_ref = useRef(false);

  return (
    <div
      onMouseEnter={() => actions.setHoverGroup(group.key)}
      onMouseLeave={() => actions.setHoverGroup(null)}
      className="left-0 flex w-max items-center gap-2"
    >
      {show_menu_button && (
        <GroupMenuButton
          group={group}
          group_index={group_index}
          group_count={group_count}
          state={state}
          actions={actions}
          is_visible={is_hovered}
          className="-ml-[27px]"
        />
      )}

      <button type="button" onClick={() => actions.toggleGroupCollapsed(group.key)} className="flex items-center" style={{ color: group.color, transform: is_collapsed ? "rotate(-90deg)" : "none" }}>
        <svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>

      {is_editing ? (
        <span className="relative inline-flex items-center">
          <input
            ref={title_input_ref}
            autoFocus
            value={state.group_draft}
            onChange={(e) => actions.updateGroupDraft(e.target.value)}
            onBlur={() => { if (!is_emoji_palette_open_ref.current) actions.commitGroupRename(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") actions.cancelGroupRename();
            }}
            className="min-w-[180px] rounded-[4px] border border-boardtree-accent bg-boardtree-surface py-px pl-1.5 pr-7 text-[16px] font-semibold outline-none"
            style={{ color: group.color }}
          />
          <EmojiInsertButton
            input_ref={title_input_ref}
            value={state.group_draft}
            onChange={actions.updateGroupDraft}
            onOpenChange={(is_open) => { is_emoji_palette_open_ref.current = is_open; }}
            size={14}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => actions.startGroupRename(group.key, group.title)}
          title="Click to rename"
          className="-mx-1.5 cursor-text rounded-[4px] border border-transparent px-1.5 py-px text-[16px] font-semibold hover:border-boardtree-border hover:bg-boardtree-surface"
          style={{ color: group.color }}
        >
          {group.title}
        </button>
      )}
      <div className="font-mono text-[11px] text-boardtree-text-faint">
        {group.items.length} items{sub_count ? ` · ${sub_count} subitems` : ""}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); actions.togglePriority(group.key); }}
        title={group.is_priority ? "Unmark as priority client" : "Mark as priority client — their tasks sort above everyone else's"}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] hover:bg-boardtree-hover-strong"
        style={{ color: group.is_priority ? "#fdab3d" : "var(--color-boardtree-text-faint)", opacity: group.is_priority || is_hovered ? 1 : 0, pointerEvents: group.is_priority || is_hovered ? "auto" : "none" }}
      >
        <svg viewBox="0 0 16 16" width="15" height="15">
          <path
            d="M8 1.7 l1.8 3.9 4.3 .5 -3.2 2.9 .9 4.2 -3.8 -2.2 -3.8 2.2 .9 -4.2 -3.2 -2.9 4.3 -.5z"
            fill={group.is_priority ? "currentColor" : "none"}
            stroke={group.is_priority ? "none" : "currentColor"}
            strokeWidth={group.is_priority ? undefined : "1.2"}
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {group.is_priority && (
        <span className="flex-none rounded-[9px] bg-[#fdab3d1a] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#b9760a]">
          Priority client
        </span>
      )}
    </div>
  );
}
