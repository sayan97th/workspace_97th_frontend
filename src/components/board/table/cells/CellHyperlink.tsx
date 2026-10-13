"use client";

import Link from "next/link";
import { useCellTooltip } from "./CellTooltip";
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
  const { anchor_props: tooltip_props, hide: hideTooltip, tooltip: tooltip_bubble } = useCellTooltip<HTMLAnchorElement>(tooltip);
  const { ref: anchor_ref, ...tooltip_handlers } = tooltip_props;

  const anchor_props = {
    className: "cell-link__anchor",
    ...tooltip_handlers,
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
      {tooltip_bubble}
    </span>
  );
}
