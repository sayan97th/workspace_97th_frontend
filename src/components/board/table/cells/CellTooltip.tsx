"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./cell-links.css";

/** Wait before the bubble shows, so sweeping the pointer across a column does not flash one per row. */
const TOOLTIP_DELAY_MS = 250;
/** Gap between the anchor and the bubble, and between the bubble and the window edges. */
const TOOLTIP_GAP = 8;

interface UseCellTooltipOptions {
  /** Only shows the bubble when the anchor's text is cut off by an ellipsis. */
  only_when_truncated?: boolean;
}

/**
 * monday style dark hover bubble for table cells and cell menus: shown after a short delay,
 * portaled to the body so no overflow clips it, placed above its anchor (below when there is
 * no room) and dismissed by any scroll. Spread `anchor_props` on the element to describe and
 * render `tooltip` anywhere next to it.
 */
export function useCellTooltip<T extends HTMLElement>(text: ReactNode, { only_when_truncated = false }: UseCellTooltipOptions = {}) {
  const anchor_ref = useRef<T>(null);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor_rect, setAnchorRect] = useState<DOMRect | null>(null);

  const cancelTimer = () => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
  };

  const show = () => {
    cancelTimer();
    timer_ref.current = setTimeout(() => {
      const anchor = anchor_ref.current;
      if (!anchor) return;
      if (only_when_truncated && anchor.scrollWidth <= anchor.clientWidth) return;
      setAnchorRect(anchor.getBoundingClientRect());
    }, TOOLTIP_DELAY_MS);
  };

  const hide = useCallback(() => {
    cancelTimer();
    setAnchorRect(null);
  }, []);

  // The bubble is fixed to where the anchor was, so any scroll (the table, the page, a menu list) dismisses it.
  useEffect(() => {
    if (!anchor_rect) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [anchor_rect, hide]);

  useEffect(() => cancelTimer, []);

  return {
    anchor_props: {
      ref: anchor_ref,
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide,
    },
    hide,
    tooltip: anchor_rect && text && typeof document !== "undefined" ? createPortal(<CellTooltipBubble anchor_rect={anchor_rect} text={text} />, document.body) : null,
  };
}

/** Places itself above the anchor (below when there is no room), centered and kept inside the window. */
function CellTooltipBubble({ anchor_rect, text }: { anchor_rect: DOMRect; text: ReactNode }) {
  const bubble_ref = useRef<HTMLDivElement>(null);

  // Measured and written straight to the node, so placing it never costs a second render.
  useLayoutEffect(() => {
    const bubble = bubble_ref.current;
    if (!bubble) return;
    const { width, height } = bubble.getBoundingClientRect();
    const anchor_center = anchor_rect.left + anchor_rect.width / 2;
    const left = Math.min(Math.max(anchor_center - width / 2, TOOLTIP_GAP), window.innerWidth - width - TOOLTIP_GAP);
    const fits_above = anchor_rect.top - height - TOOLTIP_GAP >= TOOLTIP_GAP;

    bubble.dataset.side = fits_above ? "top" : "bottom";
    bubble.style.left = `${left}px`;
    bubble.style.top = `${fits_above ? anchor_rect.top - height - TOOLTIP_GAP : anchor_rect.bottom + TOOLTIP_GAP}px`;
    bubble.style.visibility = "visible";
    bubble.style.setProperty("--cell-link-arrow-left", `${Math.min(Math.max(anchor_center - left, 12), width - 12)}px`);
  }, [anchor_rect]);

  return (
    <div ref={bubble_ref} role="tooltip" className="cell-link-tooltip" style={{ top: 0, left: 0, visibility: "hidden" }}>
      {text}
      <span className="cell-link-tooltip__arrow" style={{ left: "var(--cell-link-arrow-left)" }} aria-hidden="true" />
    </div>
  );
}
