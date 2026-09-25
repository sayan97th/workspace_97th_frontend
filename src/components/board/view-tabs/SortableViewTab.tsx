"use client";
import React from "react";
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import { PinIcon } from "@/icons/board-icons";
import InlineTitleEditor from "../InlineTitleEditor";
import type { BoardViewTabItem } from "../BoardViewTabs";
import { VIEW_TAB_PADDING_CLASS, ViewTabIcon, ViewTabLabel, viewTabIconColorClass } from "./ViewTabFace";

/** Slide timing shared by every tab that moves, whether by dragging or by the "Reorder" menu. */
export const VIEW_TAB_TRANSITION = { duration: 240, easing: "cubic-bezier(0.25, 1, 0.5, 1)" };

/**
 * Animate every layout change, not only the ones right after a drag, so a tab
 * moved from its "Reorder" menu (or a reset to the default order) also
 * slides into place instead of jumping.
 */
const animateAlways: AnimateLayoutChanges = (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export type SortableViewTabProps = {
  tab: BoardViewTabItem;
  is_active: boolean;
  is_editing: boolean;
  /** Turns dragging off (no reorder handler, or the tab is being renamed). */
  is_drag_disabled: boolean;
  /** Deep link of the tab. When set, the label is a real link, so Ctrl/Cmd click or middle click opens it in a new browser tab. */
  href: string | null;
  has_menu: boolean;
  can_change_emoji: boolean;
  /** Captures the tab's root element, used to anchor the hover card and the description popover. */
  tabRef: (el: HTMLDivElement | null) => void;
  emojiButtonRef: (el: HTMLButtonElement | null) => void;
  menuButtonRef: (el: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (label: string) => void;
  onCancelRename: () => void;
  onOpenEmojiPicker: () => void;
  onOpenMenu: () => void;
  onHoverStart: (el: HTMLElement) => void;
  onHoverEnd: () => void;
};

/**
 * One draggable tab in the board's tab bar. The whole tab can be grabbed with
 * the pointer; with the keyboard, Space on the focused tab picks it up, the
 * arrow keys move it and Space drops it (Enter still opens the tab).
 */
const SortableViewTab: React.FC<SortableViewTabProps> = ({
  tab,
  is_active,
  is_editing,
  is_drag_disabled,
  href,
  has_menu,
  can_change_emoji,
  tabRef,
  emojiButtonRef,
  menuButtonRef,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onOpenEmojiPicker,
  onOpenMenu,
  onHoverStart,
  onHoverEnd,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: is_drag_disabled,
    animateLayoutChanges: animateAlways,
    transition: VIEW_TAB_TRANSITION,
    attributes: { role: "tab", roleDescription: "draggable view tab" },
  });

  // Pointer dragging works from anywhere on the tab, keyboard dragging only
  // from the focused label, so Space inside the rename input or on the emoji
  // and "..." buttons keeps its normal meaning.
  const { onKeyDown, ...pointer_listeners } = listeners ?? {};
  const onDragKeyDown = onKeyDown as React.KeyboardEventHandler<HTMLElement> | undefined;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const setRootRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    tabRef(el);
  };

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let the browser open the link in a new tab or window for modified clicks.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelect();
  };

  const state_class = isDragging
    ? "rounded-md border-transparent bg-brand-500/[0.08] outline-dashed outline-1 -outline-offset-1 outline-brand-500/60 [&>*]:opacity-40"
    : is_active
      ? "border-brand-500"
      : "border-transparent transition-colors hover:border-shell-border-strong";

  const label_content = <ViewTabLabel tab={tab} />;

  return (
    <div
      ref={setRootRef}
      style={style}
      {...pointer_listeners}
      onMouseEnter={(event) => onHoverStart(event.currentTarget)}
      onMouseLeave={onHoverEnd}
      data-view-tab-id={tab.id}
      className={`group relative -mb-px flex-none touch-none select-none border-b-2 ${VIEW_TAB_PADDING_CLASS} ${state_class} ${
        is_drag_disabled ? "" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {tab.pinned && (
        <span className="flex flex-none items-center text-shell-text-faint" aria-label="Pinned">
          <PinIcon size={11} />
        </span>
      )}

      {can_change_emoji ? (
        <button
          ref={emojiButtonRef}
          type="button"
          aria-label="Change tab emoji"
          title="Change icon"
          onClick={onOpenEmojiPicker}
          className={`flex flex-none items-center ${viewTabIconColorClass(tab)}`}
        >
          <ViewTabIcon tab={tab} />
        </button>
      ) : (
        <span className={`flex flex-none items-center ${viewTabIconColorClass(tab)}`}>
          <ViewTabIcon tab={tab} />
        </span>
      )}

      {is_editing ? (
        <InlineTitleEditor
          value={tab.label}
          aria_label="Tab name"
          className="w-[120px] text-board-nav"
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : href ? (
        <a
          ref={setActivatorNodeRef}
          {...attributes}
          href={href}
          draggable={false}
          aria-selected={is_active}
          onKeyDown={onDragKeyDown}
          onClick={handleLinkClick}
          onDoubleClick={onStartRename}
          className="flex items-center gap-1 whitespace-nowrap text-board-nav text-shell-text outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand-500/60"
        >
          {label_content}
        </a>
      ) : (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          type="button"
          aria-selected={is_active}
          onKeyDown={onDragKeyDown}
          onClick={onSelect}
          onDoubleClick={onStartRename}
          className="flex items-center gap-1 whitespace-nowrap text-board-nav text-shell-text outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand-500/60"
        >
          {label_content}
        </button>
      )}

      {has_menu && (
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Tab options"
          onClick={onOpenMenu}
          className={
            is_active
              ? "flex flex-none items-center text-shell-text-muted"
              : "flex flex-none items-center text-shell-text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          }
        >
          <MoreDotsIcon size={12} />
        </button>
      )}
    </div>
  );
};

export default SortableViewTab;
