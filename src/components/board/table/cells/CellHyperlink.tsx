"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./cell-links.css";

interface CellHyperlinkProps {
  href: string;
  label: string;
  /** Text of the hover bubble, usually the full URL. */
  tooltip: string;
  /** Shows the hover "×" when set. Left out on cells the viewer may not edit. */
  onRemove?: () => void;
  remove_label?: string;
}

/** Wait before the bubble shows, so sweeping the pointer across a column does not flash one per row. */
const TOOLTIP_DELAY_MS = 250;
/** Gap between the link and the bubble, and between the bubble and the window edges. */
const TOOLTIP_GAP = 8;

/** An http(s) URL opens in a new tab, an app path ("/boards/12", a Doc) navigates in place. */
function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/**
 * One value of a Link or Files cell shown as monday style hyperlink text:
 * blue, truncated with an ellipsis, underlined on hover, with the full URL in
 * a dark tooltip and an optional grey "×" that removes it. Clicks on the
 * link open it, they never reach the cell's own "open menu" hit area.
 */
export default function CellHyperlink({ href, label, tooltip, onRemove, remove_label = "Remove" }: CellHyperlinkProps) {
  const anchor_ref = useRef<HTMLAnchorElement>(null);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor_rect, setAnchorRect] = useState<DOMRect | null>(null);

  const cancelTimer = () => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
  };

  const showTooltip = () => {
    cancelTimer();
    timer_ref.current = setTimeout(() => {
      if (anchor_ref.current) setAnchorRect(anchor_ref.current.getBoundingClientRect());
    }, TOOLTIP_DELAY_MS);
  };

  const hideTooltip = () => {
    cancelTimer();
    setAnchorRect(null);
  };

  // The bubble is fixed to where the link was, so any scroll (the table, the page) dismisses it.
  useEffect(() => {
    if (!anchor_rect) return;
    window.addEventListener("scroll", hideTooltip, true);
    return () => window.removeEventListener("scroll", hideTooltip, true);
  }, [anchor_rect]);

  useEffect(() => cancelTimer, []);

  const anchor_props = {
    className: "cell-link__anchor",
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    onClick: hideTooltip,
  };

  return (
    <span className="cell-link">
      {isExternalHref(href) ? (
        <a ref={anchor_ref} href={href} target="_blank" rel="noopener noreferrer" {...anchor_props}>
          {label}
        </a>
      ) : (
        <Link ref={anchor_ref} href={href} {...anchor_props}>
          {label}
        </Link>
      )}
      {onRemove && (
        <button
          type="button"
          className="cell-link__remove"
          aria-label={remove_label}
          onClick={() => {
            hideTooltip();
            onRemove();
          }}
        >
          <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {anchor_rect && typeof document !== "undefined" && createPortal(<CellLinkTooltip anchor_rect={anchor_rect} text={tooltip} />, document.body)}
    </span>
  );
}

/** Places itself above the link (below when there is no room), centered and kept inside the window. */
function CellLinkTooltip({ anchor_rect, text }: { anchor_rect: DOMRect; text: string }) {
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
