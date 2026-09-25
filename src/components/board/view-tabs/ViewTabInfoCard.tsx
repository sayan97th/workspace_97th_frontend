"use client";
import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";
import { ViewTabIcon, viewTabIconColorClass } from "./ViewTabFace";

const CARD_WIDTH = 280;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/** "Sep 25, 2026", or null when the date is missing or unreadable. */
export const formatViewDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, "MMM d, yyyy");
};

/** The status chips of a view (default, pinned, locked, hidden, unsaved), shared by the hover card and the "Manage views" panel. */
export const ViewStatusChips: React.FC<{ tab: BoardViewTabItem }> = ({ tab }) => {
  const chips = [
    tab.is_default && "Your default",
    tab.pinned && "Pinned",
    tab.is_locked && "Locked",
    tab.is_hidden && "Hidden for you",
    tab.has_unsaved_changes && "Unsaved changes",
  ].filter((chip): chip is string => Boolean(chip));
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip}
          className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
            chip === "Unsaved changes" ? "bg-[#fdab3d]/[0.16] text-[#fdab3d]" : "bg-shell-hover text-shell-text-secondary"
          }`}
        >
          {chip}
        </span>
      ))}
    </div>
  );
};

export type ViewTabInfoCardProps = {
  tab: BoardViewTabItem | null;
  /** The hovered tab. The card closes when this is null. */
  anchor_el: HTMLElement | null;
};

/**
 * The card shown after hovering a tab for a moment: what kind of view it is,
 * its description, who created it and when, and its status. Read only and
 * pointer transparent, so it never gets in the way of the tab bar.
 */
const ViewTabInfoCard: React.FC<ViewTabInfoCardProps> = ({ tab, anchor_el }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor_el) {
      setPosition(null);
      return;
    }
    const rect = anchor_el.getBoundingClientRect();
    const max_left = window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN;
    setPosition({
      top: rect.bottom + ANCHOR_GAP,
      left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, max_left)),
    });
  }, [anchor_el]);

  if (!tab || !anchor_el || !position || typeof document === "undefined") return null;

  const type_option = getBoardViewTypeOption(tab.view_type);
  const created_on = formatViewDate(tab.created_at);

  return createPortal(
    <div
      role="tooltip"
      style={{ top: position.top, left: position.left, width: CARD_WIDTH }}
      className="pointer-events-none fixed z-[1000] rounded-xl border border-boardtree-border-soft bg-boardtree-surface p-3.5 text-boardtree-text shadow-2xl shadow-black/40 motion-safe:animate-[view-tab-card-in_140ms_ease-out]"
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-shell-hover ${viewTabIconColorClass(tab)}`}>
          <ViewTabIcon tab={tab} size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-shell-text">{tab.label}</p>
          <p className="text-[11.5px] text-shell-text-faint">{type_option.label} view</p>
        </div>
      </div>

      <p className={`mt-2.5 whitespace-pre-line text-[12.5px] leading-[1.45] ${tab.description ? "text-shell-text-secondary" : "text-shell-text-faint"}`}>
        {tab.description || "No description yet."}
      </p>

      {(tab.creator_name || created_on) && (
        <p className="mt-2.5 text-[11.5px] text-shell-text-muted">
          {tab.creator_name ? `Created by ${tab.creator_name}` : "Created"}
          {created_on ? ` on ${created_on}` : ""}
        </p>
      )}

      <div className="mt-2.5 empty:hidden">
        <ViewStatusChips tab={tab} />
      </div>
    </div>,
    document.body
  );
};

export default ViewTabInfoCard;
