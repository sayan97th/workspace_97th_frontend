"use client";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "../PersonAvatar";
import type { BoardPersonOption } from "../toolbar/types";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import { LikeIcon } from "@/icons/drawer-icons";
import { formatRelativeTime } from "./commentMapping";
import {
  ALL_TAB,
  LIKE_TAB,
  buildReactionPeople,
  buildReactionTabs,
  filterRowsByTab,
  type ReactionPersonRow,
  type ReactionSource,
  type ReactionTab,
  type ReactionTabKey,
} from "./reactionPeople";
import "./reactions-people-card.scss";

const CARD_WIDTH_PX = 304;
/** Room the card needs under its trigger, beyond that it opens above. */
const CARD_ROOM_PX = 340;
const VIEWPORT_MARGIN_PX = 8;
const TRIGGER_GAP_PX = 6;

type ReactionsPeopleCardProps = {
  source: ReactionSource;
  current_user: BoardPersonOption;
  /** The tab shown first, `"all"`, `"like"` or the hovered emoji. */
  initial_tab: ReactionTabKey;
  anchor: HTMLElement;
  onEnter: () => void;
  onLeave: () => void;
  onDismiss: () => void;
  onEscape: () => void;
};

type Placement = { left: number; width: number; top?: number; bottom?: number; is_above: boolean };

const formatFullTime = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const withTime = (label: string, iso?: string): string => (iso ? `${label} · ${formatRelativeTime(iso)}` : label);

/** The second line of a row, what the person did and how long ago, for the selected tab. */
const describeRow = (row: ReactionPersonRow, tab: ReactionTabKey): { text: string; iso?: string } => {
  if (tab === LIKE_TAB) return { text: withTime("Liked", row.liked_at), iso: row.liked_at };
  if (tab !== ALL_TAB) {
    const reacted_at = row.reactions.find((reaction) => reaction.emoji === tab)?.reacted_at;
    return { text: withTime("Reacted", reacted_at), iso: reacted_at };
  }
  const has_reacted = row.reactions.length > 0;
  const label = row.has_liked && has_reacted ? "Liked and reacted" : row.has_liked ? "Liked" : row.reactions.length > 1 ? `Reacted ${row.reactions.length} times` : "Reacted";
  return { text: withTime(label, row.latest_at), iso: row.latest_at };
};

const LikeGlyph: React.FC<{ size?: number }> = ({ size = 10 }) => (
  <span className="reactions-card__like-glyph" aria-hidden="true">
    <LikeIcon size={size} filled />
  </span>
);

const TabLabel: React.FC<{ tab: ReactionTab }> = ({ tab }) => {
  if (tab.kind === "all") return <span>All</span>;
  if (tab.kind === "like") return <LikeGlyph />;
  return <span className="reactions-card__tab-emoji">{tab.key}</span>;
};

const tabAriaLabel = (tab: ReactionTab): string => {
  const people = `${tab.count} ${tab.count === 1 ? "person" : "people"}`;
  if (tab.kind === "all") return `All, ${people}`;
  if (tab.kind === "like") return `Liked, ${people}`;
  return `Reacted with ${tab.key}, ${people}`;
};

/**
 * monday style "who liked and who reacted" card. One row per person, with
 * tabs to narrow it down to the likes or to a single emoji. On the All tab
 * every row lists what that person did on the right, on the other tabs the
 * avatar carries a badge of the action, so it is easy to tell who did what.
 * Portalled to the body so the drawer's scroll areas never clip it.
 */
const ReactionsPeopleCard: React.FC<ReactionsPeopleCardProps> = ({ source, current_user, initial_tab, anchor, onEnter, onLeave, onDismiss, onEscape }) => {
  const card_ref = useRef<HTMLDivElement>(null);
  const id_prefix = useId();
  const tabId = (key: ReactionTabKey) => `${id_prefix}-tab-${tabs.findIndex((tab) => tab.key === key)}`;
  const tab_refs = useRef(new Map<ReactionTabKey, HTMLButtonElement>());
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [selected_tab, setSelectedTab] = useState<ReactionTabKey>(initial_tab);

  const rows = useMemo(() => buildReactionPeople(source, current_user), [source, current_user]);
  const tabs = useMemo(() => buildReactionTabs(source, rows), [source, rows]);
  // The selected emoji can disappear while the card is open (its last reaction was removed).
  const active_tab = tabs.some((tab) => tab.key === selected_tab) ? selected_tab : ALL_TAB;
  const visible_rows = filterRowsByTab(rows, active_tab);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(CARD_WIDTH_PX, window.innerWidth - VIEWPORT_MARGIN_PX * 2);
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN_PX), window.innerWidth - width - VIEWPORT_MARGIN_PX);
    const is_above = rect.bottom + CARD_ROOM_PX > window.innerHeight && rect.top > CARD_ROOM_PX;
    setPlacement(
      is_above
        ? { left, width, bottom: window.innerHeight - rect.top + TRIGGER_GAP_PX, is_above }
        : { left, width, top: rect.bottom + TRIGGER_GAP_PX, is_above }
    );
  }, [anchor]);

  // The trigger scrolls away from a fixed card, so any scroll outside the card's own list dismisses it.
  useEffect(() => {
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && card_ref.current?.contains(event.target)) return;
      onDismiss();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [onDismiss]);

  const selectTab = (key: ReactionTabKey, should_focus = false) => {
    setSelectedTab(key);
    if (should_focus) tab_refs.current.get(key)?.focus();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.key === active_tab);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (event.key === "Home") return selectTab(tabs[0].key, true);
    if (event.key === "End") return selectTab(tabs[tabs.length - 1].key, true);
    if (step === 0) return;
    event.preventDefault();
    selectTab(tabs[(index + step + tabs.length) % tabs.length].key, true);
  };

  if (!placement) return null;

  return createPortal(
    <div
      ref={card_ref}
      role="dialog"
      aria-label="People who liked or reacted"
      // Focusable, so a click on a row keeps focus inside the card instead of closing it.
      tabIndex={-1}
      className="reactions-card"
      data-placement={placement.is_above ? "above" : "below"}
      style={{ left: placement.left, top: placement.top, bottom: placement.bottom, width: placement.width }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && card_ref.current?.contains(event.relatedTarget)) return;
        onLeave();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onEscape();
      }}
    >
      <div className="reactions-card__tabs" role="tablist" aria-label="Filter by reaction" onKeyDown={handleTabKeyDown}>
        {tabs.map((tab) => {
          const is_active = tab.key === active_tab;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                if (node) tab_refs.current.set(tab.key, node);
                else tab_refs.current.delete(tab.key);
              }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={is_active}
              aria-label={tabAriaLabel(tab)}
              tabIndex={is_active ? 0 : -1}
              data-kind={tab.kind}
              className="reactions-card__tab"
              onClick={() => selectTab(tab.key)}
            >
              <TabLabel tab={tab} />
              <span className="reactions-card__tab-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      <ul className="reactions-card__list" role="tabpanel" aria-labelledby={tabId(active_tab)}>
        {visible_rows.map((row) => {
          const detail = describeRow(row, active_tab);
          return (
            <li key={`${active_tab}-${row.person.id}`} className="reactions-card__row" data-you={row.is_you || undefined}>
              <span className="reactions-card__avatar">
                <PersonAvatar person={row.person} size={32} />
                {active_tab === LIKE_TAB && (
                  <span className="reactions-card__badge" data-kind="like">
                    <LikeIcon size={9} filled />
                  </span>
                )}
                {active_tab !== ALL_TAB && active_tab !== LIKE_TAB && (
                  <span className="reactions-card__badge" data-kind="emoji">
                    {active_tab}
                  </span>
                )}
              </span>

              <span className="reactions-card__who">
                <span className="reactions-card__name-line">
                  <span className={`reactions-card__name ${getDeactivatedClass(row.person.is_deactivated)}`}>{row.person.name}</span>
                  {row.is_you && <span className="reactions-card__you">You</span>}
                </span>
                <span className="reactions-card__detail" title={formatFullTime(detail.iso)}>
                  {detail.text}
                </span>
              </span>

              {active_tab === ALL_TAB && (
                <span className="reactions-card__marks" aria-label={describeRow(row, ALL_TAB).text}>
                  {row.has_liked && (
                    <span className="reactions-card__mark" data-kind="like" title={withTime("Liked", row.liked_at)}>
                      <LikeIcon size={11} filled />
                    </span>
                  )}
                  {row.reactions.map((reaction) => (
                    <span key={reaction.emoji} className="reactions-card__mark" data-kind="emoji" title={withTime(`Reacted ${reaction.emoji}`, reaction.reacted_at)}>
                      {reaction.emoji}
                    </span>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  );
};

export default ReactionsPeopleCard;
