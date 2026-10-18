"use client";
import React from "react";
import { LockBadgeIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { PinIcon, TableViewIcon } from "@/icons/board-icons";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";
import "./view-tabs.scss";

/** monday shows tabs as plain text, so only a tab the user gave an emoji carries a leading glyph. */
export const hasViewTabGlyph = (tab: BoardViewTabItem): boolean => Boolean(tab.emoji);

/**
 * The tab's leading glyph: its emoji when it has one, else the icon of its
 * view type (Table, Kanban, Doc...). The primary tab keeps the green table
 * icon it has always had.
 */
export const ViewTabIcon: React.FC<{ tab: BoardViewTabItem; size?: number }> = ({ tab, size = 14 }) => {
  if (tab.emoji) return <span style={{ fontSize: size, lineHeight: 1 }}>{tab.emoji}</span>;
  if (tab.is_primary && (!tab.view_type || tab.view_type === "table")) return <TableViewIcon size={size} />;
  const { Icon } = getBoardViewTypeOption(tab.view_type);
  return <Icon size={size} />;
};

/** Whether {@link ViewTabIcon} is drawn in the primary green (the primary table) rather than muted gray. */
export const isViewTabIconAccent = (tab: BoardViewTabItem): boolean => Boolean(tab.emoji || tab.is_primary);

/** The small dot shown on a tab whose filter, sort or display changes aren't saved to the view. */
export const UnsavedChangesDot: React.FC = () => (
  <span className="vt-unsaved-dot" role="img" aria-label="Unsaved changes" title="This view has unsaved changes" />
);

/** The label with its trailing lock badge and unsaved changes dot. */
export const ViewTabLabel: React.FC<{ tab: BoardViewTabItem }> = ({ tab }) => (
  <>
    <span className="vt-tab-label-text">{tab.label}</span>
    {tab.is_locked && (
      <span className="vt-tab-badge" aria-label="Locked">
        <LockBadgeIcon size={10} />
      </span>
    )}
    {tab.has_unsaved_changes && <UnsavedChangesDot />}
  </>
);

export type ViewTabFaceProps = {
  tab: BoardViewTabItem;
  /** Reserves the "..." button's space, matching a tab that has an options menu. */
  has_menu?: boolean;
};

/**
 * A non interactive tab, used by the width measuring row. Mirrors the markup
 * of the real tab in `SortableViewTab`, both share the `.vt-tab` box.
 */
const ViewTabFace: React.FC<ViewTabFaceProps> = ({ tab, has_menu = false }) => (
  <div className="vt-tab" data-state="active" data-has-menu={has_menu}>
    {tab.pinned && (
      <span className="vt-tab-badge">
        <PinIcon size={12} />
      </span>
    )}
    {hasViewTabGlyph(tab) && (
      <span className="vt-tab-glyph">
        <ViewTabIcon tab={tab} />
      </span>
    )}
    <span className="vt-tab-label">
      <ViewTabLabel tab={tab} />
    </span>
    {has_menu && (
      <span className="vt-tab-menu-button">
        <MoreDotsIcon size={14} />
      </span>
    )}
  </div>
);

export default ViewTabFace;
