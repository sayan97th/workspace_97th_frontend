"use client";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "../PersonAvatar";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import { formatRelativeTime } from "./commentMapping";
import { formatReactorNames } from "./reactionFormatting";
import type { DrawerReaction, DrawerReactor } from "./types";

export type ReactionPillProps = {
  reaction: DrawerReaction;
  /** Adds or removes the current user's own reaction with this emoji. */
  onToggle: () => void;
};

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 150;
/** A touch screen has no hover, so holding the pill this long opens the list instead of toggling. */
const LONG_PRESS_MS = 500;
const CARD_WIDTH_PX = 248;
const CARD_MAX_HEIGHT_PX = 300;
const VIEWPORT_MARGIN_PX = 8;

const formatReactedTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

/** Names only, for a reaction the server has not listed yet (a fresh optimistic one, or mock data). */
const namesToReactors = (reactor_names: string[]): DrawerReactor[] =>
  reactor_names.map((name, index) => ({ id: `name-${index}`, name, initials: name.slice(0, 1).toUpperCase(), avatar_seed: index + 1 }));

type ReactorsCardProps = {
  reaction: DrawerReaction;
  anchor: HTMLElement;
  onEnter: () => void;
  onLeave: () => void;
  onDismiss: () => void;
};

/** The floating "who reacted" list, portalled above the drawers and placed under (or above) the pill. */
const ReactorsCard: React.FC<ReactorsCardProps> = ({ reaction, anchor, onEnter, onLeave, onDismiss }) => {
  const [position, setPosition] = useState<{ top: number; left: number; is_above: boolean } | null>(null);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const is_above = rect.bottom + CARD_MAX_HEIGHT_PX > window.innerHeight;
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN_PX), window.innerWidth - CARD_WIDTH_PX - VIEWPORT_MARGIN_PX);
    setPosition({ left, top: is_above ? rect.top - 6 : rect.bottom + 6, is_above });
  }, [anchor]);

  // The pill scrolls away from a fixed card, so any scroll outside the card's own list dismisses it.
  const card_ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && card_ref.current?.contains(event.target)) return;
      onDismiss();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [onDismiss]);

  if (!position) return null;

  const reactors = reaction.reactors && reaction.reactors.length > 0 ? reaction.reactors : namesToReactors(reaction.reactor_names);

  return createPortal(
    <div
      ref={card_ref}
      role="dialog"
      aria-label={`People who reacted with ${reaction.emoji}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed z-[1200] rounded-xl border border-shell-border-strong bg-shell-panel p-3 text-shell-text shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
      style={{ top: position.top, left: position.left, width: CARD_WIDTH_PX, transform: position.is_above ? "translateY(-100%)" : undefined }}
    >
      <div className="mb-2 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">
        <span className="text-base normal-case leading-none">{reaction.emoji}</span>
        {reaction.count} {reaction.count === 1 ? "reaction" : "reactions"}
      </div>
      <ul className="shell-scrollbar flex max-h-[220px] flex-col gap-1 overflow-y-auto">
        {reactors.map((person) => (
          <li key={person.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
            <PersonAvatar person={person} size={24} />
            <span className={`min-w-0 flex-1 truncate text-[13px] font-medium text-shell-text ${getDeactivatedClass(person.is_deactivated)}`}>{person.name}</span>
            {person.reacted_at && (
              <span className="flex-none text-[11px] text-shell-text-faint" title={formatReactedTime(person.reacted_at)}>
                {formatRelativeTime(person.reacted_at)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
};

/**
 * One reaction pill of a comment or reply. Clicking it toggles the current
 * user's own reaction, hovering or focusing it (or holding it on a touch
 * screen) opens the list of everyone who reacted with that emoji and when, so
 * nobody has to guess who "3" stands for.
 */
const ReactionPill: React.FC<ReactionPillProps> = ({ reaction, onToggle }) => {
  const pill_ref = useRef<HTMLButtonElement>(null);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long_press_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const did_long_press_ref = useRef(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
  }, []);

  const openCard = useCallback(() => {
    clearTimer();
    timer_ref.current = setTimeout(() => setAnchor(pill_ref.current), OPEN_DELAY_MS);
  }, [clearTimer]);

  const closeCard = useCallback(() => {
    clearTimer();
    timer_ref.current = setTimeout(() => setAnchor(null), CLOSE_DELAY_MS);
  }, [clearTimer]);

  const dismissCard = useCallback(() => {
    clearTimer();
    setAnchor(null);
  }, [clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      if (long_press_ref.current) clearTimeout(long_press_ref.current);
    },
    [clearTimer]
  );

  const startLongPress = (event: React.PointerEvent) => {
    if (event.pointerType !== "touch") return;
    did_long_press_ref.current = false;
    long_press_ref.current = setTimeout(() => {
      did_long_press_ref.current = true;
      setAnchor(pill_ref.current);
    }, LONG_PRESS_MS);
  };

  const endLongPress = () => {
    if (long_press_ref.current) clearTimeout(long_press_ref.current);
    long_press_ref.current = null;
  };

  const handleClick = () => {
    // A long press already opened the list, letting go must not also toggle the reaction.
    if (did_long_press_ref.current) {
      did_long_press_ref.current = false;
      return;
    }
    onToggle();
  };

  return (
    <>
      <button
        ref={pill_ref}
        type="button"
        onClick={handleClick}
        onMouseEnter={openCard}
        onMouseLeave={closeCard}
        onFocus={openCard}
        onBlur={closeCard}
        onPointerDown={startLongPress}
        onPointerUp={endLongPress}
        onPointerCancel={endLongPress}
        onContextMenu={(event) => {
          // The long press on a touch screen would otherwise open the browser's context menu on top of the list.
          if (did_long_press_ref.current) event.preventDefault();
        }}
        aria-label={`${reaction.emoji} ${reaction.count}, ${formatReactorNames(reaction.reactor_names)} reacted. ${reaction.reacted_by_me ? "Click to remove your reaction." : "Click to add your reaction."}`}
        className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors"
        style={{
          background: reaction.reacted_by_me ? "rgba(87,155,252,0.18)" : "var(--color-shell-hover)",
          borderColor: reaction.reacted_by_me ? "#579bfc" : "var(--color-shell-border-strong)",
        }}
      >
        <span className="text-sm">{reaction.emoji}</span>
        {reaction.count}
      </button>
      {anchor && <ReactorsCard reaction={reaction} anchor={anchor} onEnter={clearTimer} onLeave={closeCard} onDismiss={dismissCard} />}
    </>
  );
};

export default ReactionPill;
