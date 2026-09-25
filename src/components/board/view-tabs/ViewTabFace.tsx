"use client";
import React from "react";
import { LockBadgeIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { PinIcon, TableViewIcon } from "@/icons/board-icons";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";

/** Shared spacing of every tab, so the measuring row, the drag preview and the real tab have the same width. */
export const VIEW_TAB_PADDING_CLASS = "flex items-center gap-1.5 px-3 py-[9px]";

/**
 * The tab's leading glyph: its emoji when it has one, else the icon of its
 * view type (Table, Kanban, Doc...). The primary tab keeps the green table
 * icon it has always had.
 */
export const ViewTabIcon: React.FC<{ tab: BoardViewTabItem; size?: number }> = ({ tab, size = 13 }) => {
  if (tab.emoji) return <span className="text-[13px] leading-none not-italic">{tab.emoji}</span>;
  if (tab.is_primary && (!tab.view_type || tab.view_type === "table")) return <TableViewIcon size={size} />;
  const { Icon } = getBoardViewTypeOption(tab.view_type);
  return <Icon size={size} />;
};

/** Color of {@link ViewTabIcon}: green for the primary table and for emojis, muted for type icons. */
export const viewTabIconColorClass = (tab: BoardViewTabItem): string =>
  tab.emoji || tab.is_primary ? "text-[#00c875]" : "text-shell-text-muted";

/** The small dot shown on a tab whose filter, sort or display changes aren't saved to the view. */
export const UnsavedChangesDot: React.FC = () => (
  <span
    className="h-[6px] w-[6px] flex-none rounded-full bg-[#fdab3d]"
    role="img"
    aria-label="Unsaved changes"
    title="This view has unsaved changes"
  />
);

/** The label with its trailing lock badge and unsaved changes dot. */
export const ViewTabLabel: React.FC<{ tab: BoardViewTabItem }> = ({ tab }) => (
  <>
    <span className="max-w-[220px] truncate">{tab.label}</span>
    {tab.is_locked && (
      <span className="flex flex-none items-center text-shell-text-faint" aria-label="Locked">
        <LockBadgeIcon size={9} />
      </span>
    )}
    {tab.has_unsaved_changes && <UnsavedChangesDot />}
  </>
);

export type ViewTabFaceProps = {
  tab: BoardViewTabItem;
  /** Reserves the "..." button's space, matching a tab that has an options menu. */
  has_menu?: boolean;
  className?: string;
};

/**
 * A non interactive tab, used by the width measuring row and the drag preview.
 * Mirrors the markup of the real tab in `SortableViewTab`.
 */
const ViewTabFace: React.FC<ViewTabFaceProps> = ({ tab, has_menu = false, className = "" }) => (
  <div className={`${VIEW_TAB_PADDING_CLASS} ${className}`}>
    {tab.pinned && (
      <span className="flex flex-none items-center text-shell-text-faint">
        <PinIcon size={11} />
      </span>
    )}
    <span className={`flex flex-none items-center ${viewTabIconColorClass(tab)}`}>
      <ViewTabIcon tab={tab} />
    </span>
    <span className="flex items-center gap-1 whitespace-nowrap text-board-nav text-shell-text">
      <ViewTabLabel tab={tab} />
    </span>
    {has_menu && (
      <span className="flex flex-none items-center text-shell-text-muted">
        <MoreDotsIcon size={12} />
      </span>
    )}
  </div>
);

export default ViewTabFace;
