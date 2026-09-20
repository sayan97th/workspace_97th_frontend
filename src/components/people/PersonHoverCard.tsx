"use client";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PersonAvatar from "@/components/board/PersonAvatar";
import DeactivatedBadge from "@/components/board/DeactivatedBadge";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import { DEACTIVATED_TOOLTIP, getDeactivatedClass } from "@/lib/deactivated-user";
import { getUserInitials } from "@/lib/user";
import { peopleService, type PersonCardDto } from "@/services/people.service";

/** The little we know about someone before their card is fetched. */
export type HoverCardPerson = {
  id: string | number;
  name: string;
  avatar_url?: string | null;
  /** Known before the card loads, so a deactivated person is never flashed as active. */
  is_deactivated?: boolean;
};

type HoverCardTarget = { person: HoverCardPerson; anchor: HTMLElement };

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 150;
const CARD_WIDTH_PX = 280;
const VIEWPORT_MARGIN_PX = 8;
/** Enough for the tallest card (avatar, name, title, email, local time), used to decide whether it fits below the trigger. */
const CARD_MAX_HEIGHT_PX = 190;

const toAvatarPerson = (person: HoverCardPerson): BoardPersonOption => ({
  id: String(person.id),
  name: person.name,
  initials: getUserInitials({ full_name: person.name }),
  avatar_seed: Number(person.id) || 0,
  avatar_url: person.avatar_url ?? undefined,
  is_deactivated: person.is_deactivated,
});

/** "3:45 PM" in `timezone`, or null when the zone is unknown or invalid. */
const formatLocalTime = (timezone: string | null): string | null => {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date());
  } catch {
    return null;
  }
};

/**
 * Open/close state for a hover card, with the small delays that stop it from
 * flashing while the pointer crosses the page or travels from the trigger to
 * the card itself. Shared by {@link PersonHoverCard} (one trigger) and
 * `RichTextContent` (many `@mention` spans inside one rendered body).
 */
export function useHoverCardController() {
  const [target, setTarget] = useState<HoverCardTarget | null>(null);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
  }, []);

  const show = useCallback(
    (person: HoverCardPerson, anchor: HTMLElement) => {
      clearTimer();
      timer_ref.current = setTimeout(() => setTarget({ person, anchor }), OPEN_DELAY_MS);
    },
    [clearTimer]
  );

  const hide = useCallback(() => {
    clearTimer();
    timer_ref.current = setTimeout(() => setTarget(null), CLOSE_DELAY_MS);
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setTarget(null);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { target, show, hide, keepOpen: clearTimer, dismiss };
}

type PersonCardPopoverProps = {
  target: HoverCardTarget | null;
  onEnter: () => void;
  onLeave: () => void;
  onDismiss: () => void;
};

/** The floating profile card itself, portalled above every drawer, positioned under (or above) its anchor. */
export const PersonCardPopover: React.FC<PersonCardPopoverProps> = ({ target, onEnter, onLeave, onDismiss }) => {
  const [card, setCard] = useState<PersonCardDto | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number; is_above: boolean } | null>(null);

  const person_id = target?.person.id;

  useEffect(() => {
    setCard(null);
    if (person_id === undefined) return;

    let is_current = true;
    peopleService
      .getCard(person_id)
      .then((result) => {
        if (is_current) setCard(result);
      })
      .catch(() => {
        // The card still renders the name and avatar we already had.
      });
    return () => {
      is_current = false;
    };
  }, [person_id]);

  useLayoutEffect(() => {
    if (!target) {
      setPosition(null);
      return;
    }
    const rect = target.anchor.getBoundingClientRect();
    const is_above = rect.bottom + CARD_MAX_HEIGHT_PX > window.innerHeight;
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN_PX), window.innerWidth - CARD_WIDTH_PX - VIEWPORT_MARGIN_PX);
    setPosition({ left, top: is_above ? rect.top - 6 : rect.bottom + 6, is_above });
  }, [target]);

  // The anchor scrolls away from a fixed-position card, so any scroll dismisses it.
  useEffect(() => {
    if (!target) return;
    window.addEventListener("scroll", onDismiss, true);
    return () => window.removeEventListener("scroll", onDismiss, true);
  }, [target, onDismiss]);

  if (!target || !position || typeof document === "undefined") return null;

  const name = card?.name ?? target.person.name;
  const is_deactivated = card?.is_deactivated ?? target.person.is_deactivated ?? false;
  const local_time = formatLocalTime(card?.timezone ?? null);

  return createPortal(
    <div
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed z-[1200] rounded-xl border border-shell-border-strong bg-shell-panel p-4 text-shell-text shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
      style={{
        top: position.top,
        left: position.left,
        width: CARD_WIDTH_PX,
        transform: position.is_above ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <PersonAvatar person={toAvatarPerson({ ...target.person, avatar_url: card?.avatar_url ?? target.person.avatar_url, is_deactivated })} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`truncate text-[14.5px] font-bold ${getDeactivatedClass(is_deactivated)}`}>{name}</span>
            <DeactivatedBadge is_deactivated={is_deactivated} />
          </div>
          {card?.job_title && <div className="truncate text-[12.5px] text-shell-text-muted">{card.job_title}</div>}
        </div>
      </div>

      {card ? (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-shell-border pt-3 text-[12.5px]">
          {is_deactivated ? (
            <span className="text-shell-text-faint">{DEACTIVATED_TOOLTIP}. They can no longer sign in.</span>
          ) : (
            <>
              <a href={`mailto:${card.email}`} className="truncate text-[#7fb2ff] hover:text-[#9cc4ff]">
                {card.email}
              </a>
              {local_time && <span className="text-shell-text-muted">{local_time} local time</span>}
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-shell-border pt-3 text-[12.5px] text-shell-text-faint">Loading profile…</div>
      )}
    </div>,
    document.body
  );
};

export type PersonHoverCardProps = {
  person: HoverCardPerson;
  children: React.ReactNode;
  className?: string;
};

/** Wraps any inline trigger (an avatar, an author name) so hovering or focusing it shows that person's profile card. */
const PersonHoverCard: React.FC<PersonHoverCardProps> = ({ person, children, className }) => {
  const trigger_ref = useRef<HTMLSpanElement>(null);
  const { target, show, hide, keepOpen, dismiss } = useHoverCardController();

  const openCard = () => {
    if (trigger_ref.current) show(person, trigger_ref.current);
  };

  return (
    <>
      <span
        ref={trigger_ref}
        className={className}
        onMouseEnter={openCard}
        onMouseLeave={hide}
        onFocus={openCard}
        onBlur={hide}
      >
        {children}
      </span>
      <PersonCardPopover target={target} onEnter={keepOpen} onLeave={hide} onDismiss={dismiss} />
    </>
  );
};

export default PersonHoverCard;
