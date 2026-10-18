"use client";
import React, { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { getBoardViewTypeOption } from "../boardViewTypes";
import type { BoardViewTabItem } from "../BoardViewTabs";
import ViewCreatorAvatar from "./ViewCreatorAvatar";
import { ViewTabIcon, isViewTabIconAccent } from "./ViewTabFace";

const CARD_WIDTH = 320;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/** "Sep 25, 2026", or null when the date is missing or unreadable. */
export const formatViewDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, "MMM d, yyyy");
};

type ViewStatusChip = { key: string; label: string; tone: "neutral" | "info" | "success" | "warning" };

/** The status of a view (default, pinned, locked, hidden, unsaved) as labeled, toned chips. */
export const getViewStatusChips = (tab: BoardViewTabItem): ViewStatusChip[] =>
  [
    tab.is_default && { key: "default", label: "Your default", tone: "success" as const },
    tab.pinned && { key: "pinned", label: "Pinned", tone: "info" as const },
    tab.is_locked && { key: "locked", label: "Locked", tone: "neutral" as const },
    tab.is_hidden && { key: "hidden", label: "Hidden for you", tone: "neutral" as const },
    tab.has_unsaved_changes && { key: "unsaved", label: "Unsaved changes", tone: "warning" as const },
  ].filter((chip): chip is ViewStatusChip => Boolean(chip));

/** The status chips of a view, shared by the hover card and the "Manage views" dialog. */
export const ViewStatusChips: React.FC<{ tab: BoardViewTabItem; className?: string }> = ({ tab, className = "" }) => {
  const chips = getViewStatusChips(tab);
  if (chips.length === 0) return null;

  return (
    <div className={`vt-chip-list ${className}`}>
      {chips.map((chip) => (
        <span key={chip.key} className="vt-chip" data-tone={chip.tone}>
          {chip.label}
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
 * its description, its status, who created it and when it last changed.
 * Read only and pointer transparent, so it never gets in the way of the tab bar.
 */
const ViewTabInfoCard: React.FC<ViewTabInfoCardProps> = ({ tab, anchor_el }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor_el) {
      setPosition(null);
      return;
    }
    const rect = anchor_el.getBoundingClientRect();
    const max_left = window.innerWidth - Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2) - VIEWPORT_MARGIN;
    setPosition({
      top: rect.bottom + ANCHOR_GAP,
      left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, max_left)),
    });
  }, [anchor_el]);

  if (!tab || !anchor_el || !position || typeof document === "undefined") return null;

  const type_option = getBoardViewTypeOption(tab.view_type);
  const created_on = formatViewDate(tab.created_at);
  const updated_on = formatViewDate(tab.updated_at);

  return createPortal(
    <div
      role="tooltip"
      className="vt-card"
      style={{ top: position.top, left: position.left, width: CARD_WIDTH, maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)` }}
    >
      <div className="vt-card-header">
        <span className="vt-icon-tile" data-size="lg" data-accent={isViewTabIconAccent(tab)}>
          <ViewTabIcon tab={tab} size={18} />
        </span>
        <div className="min-w-0">
          <p className="vt-card-title">{tab.label}</p>
          <p className="vt-card-subtitle">
            {type_option.label} view{tab.is_primary ? ", main view of this board" : ""}
          </p>
        </div>
      </div>

      <p className="vt-card-description" data-empty={!tab.description}>
        {tab.description || "No description yet."}
      </p>

      <ViewStatusChips tab={tab} className="vt-card-chips" />

      {(tab.creator_name || created_on || updated_on) && (
        <dl className="vt-card-meta">
          {tab.creator_name && (
            <>
              <dt>Created by</dt>
              <dd>
                <ViewCreatorAvatar full_name={tab.creator_name} photo_url={tab.creator_photo_url} />
                <span>{tab.creator_name}</span>
              </dd>
            </>
          )}
          {created_on && (
            <>
              <dt>Created on</dt>
              <dd>
                <span>{created_on}</span>
              </dd>
            </>
          )}
          {updated_on && updated_on !== created_on && (
            <>
              <dt>Last updated</dt>
              <dd>
                <span>{updated_on}</span>
              </dd>
            </>
          )}
        </dl>
      )}
    </div>,
    document.body
  );
};

export default ViewTabInfoCard;
