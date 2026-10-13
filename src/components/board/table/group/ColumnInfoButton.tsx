"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnLinkage } from "../types";
import "./column-info.css";

/** Wait before the card opens on hover, and before it closes once the pointer leaves. */
const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 150;
/** Gap between the (i) and the card, and between the card and the window edges. */
const CARD_GAP = 8;

interface ColumnInfoButtonProps {
  title: string;
  linkage?: ColumnLinkage;
  description?: string;
}

/** Whether a column has anything for the header's (i) to show. */
export function hasColumnInfo(linkage: ColumnLinkage | undefined, description: string | undefined): boolean {
  return Boolean(description) || Boolean(linkage && (linkage.mirrored_column || linkage.boards.length > 0 || linkage.hidden_board_count > 0));
}

/**
 * The (i) next to a column title, monday.com style. Hovering (or focusing) it opens a card with
 * the column's "Linkage" (what a Mirror mirrors and from which board, the boards a Connect
 * boards column shows items from) and its "Column description". The card stays open while the
 * pointer is over it, so its board links can be clicked.
 */
export default function ColumnInfoButton({ title, linkage, description }: ColumnInfoButtonProps) {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor_rect, setAnchorRect] = useState<DOMRect | null>(null);

  const clearTimer = () => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
  };
  const scheduleOpen = () => {
    clearTimer();
    timer_ref.current = setTimeout(() => {
      if (trigger_ref.current) setAnchorRect(trigger_ref.current.getBoundingClientRect());
    }, OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    clearTimer();
    timer_ref.current = setTimeout(() => setAnchorRect(null), CLOSE_DELAY_MS);
  };
  const closeNow = () => {
    clearTimer();
    setAnchorRect(null);
  };

  useEffect(() => clearTimer, []);

  // Fixed to where the (i) was, so scrolling the table closes it.
  useEffect(() => {
    if (!anchor_rect) return;
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && document.querySelector(".column-info")?.contains(event.target)) return;
      closeNow();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [anchor_rect]);

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        className="column-info-trigger"
        aria-label={`About the ${title} column`}
        aria-expanded={anchor_rect !== null}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
        onClick={(event) => {
          event.stopPropagation();
          if (anchor_rect) closeNow();
          else if (trigger_ref.current) setAnchorRect(trigger_ref.current.getBoundingClientRect());
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeNow();
        }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.2 V11.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
        </svg>
      </button>
      {anchor_rect &&
        typeof document !== "undefined" &&
        createPortal(
          <ColumnInfoCard anchor_rect={anchor_rect} linkage={linkage} description={description} onEnter={clearTimer} onLeave={scheduleClose} onNavigate={closeNow} />,
          document.body
        )}
    </>
  );
}

interface ColumnInfoCardProps {
  anchor_rect: DOMRect;
  linkage?: ColumnLinkage;
  description?: string;
  onEnter: () => void;
  onLeave: () => void;
  onNavigate: () => void;
}

/** The card itself, below the (i) (above when there is no room), kept inside the window. */
function ColumnInfoCard({ anchor_rect, linkage, description, onEnter, onLeave, onNavigate }: ColumnInfoCardProps) {
  const card_ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = card_ref.current;
    if (!card) return;
    const { width, height } = card.getBoundingClientRect();
    const center = anchor_rect.left + anchor_rect.width / 2;
    const left = Math.min(Math.max(center - width / 2, CARD_GAP), window.innerWidth - width - CARD_GAP);
    const fits_below = anchor_rect.bottom + CARD_GAP + height <= window.innerHeight - CARD_GAP;
    card.style.left = `${left}px`;
    card.style.top = `${fits_below ? anchor_rect.bottom + CARD_GAP : Math.max(CARD_GAP, anchor_rect.top - CARD_GAP - height)}px`;
    card.style.visibility = "visible";
  }, [anchor_rect]);

  const boards = linkage?.boards ?? [];
  const hidden_count = linkage?.hidden_board_count ?? 0;

  return (
    <div ref={card_ref} className="column-info" role="tooltip" style={{ top: 0, left: 0, visibility: "hidden" }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {linkage?.mirrored_column && (
        <div className="column-info__section">
          <LinkageIcon />
          <div className="column-info__label">Linkage</div>
          <div className="column-info__text">
            Mirroring `{linkage.mirrored_column.label}` column from{" "}
            <Link href={linkage.mirrored_column.board_href} className="column-info__link" onClick={onNavigate}>
              <BoardIcon />
              {linkage.mirrored_column.board_name}
            </Link>{" "}
            board
          </div>
        </div>
      )}
      {linkage && (boards.length > 0 || hidden_count > 0) && (
        <div className="column-info__section">
          <LinkageIcon />
          <div className="column-info__label">Linkage</div>
          <div>
            <div className="column-info__text">This column shows items from</div>
            <div className="column-info__chips">
              {boards.map((board) => (
                <Link key={board.id} href={board.href} className="column-info__chip" onClick={onNavigate}>
                  <BoardIcon />
                  <span>{board.name}</span>
                </Link>
              ))}
              {hidden_count > 0 && (
                <span className="column-info__chip">
                  <span>
                    {hidden_count} private {hidden_count === 1 ? "board" : "boards"}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {description && (
        <div className="column-info__section">
          <span className="column-info__icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
              <path d="M2.5 4 H13.5 M2.5 8 H13.5 M2.5 12 H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <div className="column-info__label">Column description</div>
          <div className="column-info__text">{description}</div>
        </div>
      )}
    </div>
  );
}

function LinkageIcon() {
  return (
    <span className="column-info__icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
        <path d="M4 2.5 V6.5 a3.5 3.5 0 0 0 3.5 3.5 H12.5 M10 7.5 L12.5 10 L10 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function BoardIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3 V13" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
