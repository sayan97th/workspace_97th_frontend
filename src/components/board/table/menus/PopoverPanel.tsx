"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOutsideClick } from "../useOutsideClick";

/** Gap kept between a nudged panel and the window's bottom edge. */
const VIEWPORT_MARGIN = 8;

interface PopoverPanelProps {
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Shared anchored popover for the table's per-cell/column/group menus (Status, Label,
 * Timeline, Date, People, Tags, Column, Group, ...). Renders an invisible zero-size marker
 * in the caller's own DOM position — inheriting whatever positioned box (`relative`/`absolute`/
 * `sticky`) the caller already sits in — then portals the actual visible panel to
 * `document.body`, `position: fixed` over a proxy box that matches that marker's live
 * bounding rect. The caller's own `className`/`style` (e.g. `"left-1/2 top-full w-[292px]
 * -translate-x-1/2"`) is applied unchanged to the panel inside that proxy, so it resolves
 * against the same box it always did and ends up in the exact same visual spot.
 *
 * This is the same escape-the-row's-stacking-context trick `BoardPopover`/`MenuFlyout` already
 * use for the row "..." menu: a pinned (sticky) column always renders above a plain in-flow
 * descendant a few levels inside a lower-z-index ancestor, no matter how high that
 * descendant's own z-index is set, because CSS z-index only competes within a single stacking
 * context. Portaling to `document.body` sidesteps every ancestor stacking context at once,
 * instead of chasing z-index values row by row.
 */
export default function PopoverPanel({ onClose, className, style, children }: PopoverPanelProps) {
  const marker_ref = useRef<HTMLDivElement>(null);
  const [anchor_rect, setAnchorRect] = useState<DOMRect | null>(null);
  const panel_ref = useOutsideClick<HTMLDivElement>(true, onClose);
  // How far the panel is nudged up so its bottom edge stays inside the window, see `useLayoutEffect` below.
  const [shift_y, setShiftY] = useState(0);

  useLayoutEffect(() => {
    const marker_el = marker_ref.current;
    if (!marker_el) return;

    const updateRect = () => setAnchorRect(marker_el.getBoundingClientRect());
    updateRect();

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    // The anchor box itself can resize independently of the window (e.g. the
    // active cell's outline, or a row height change) while the menu stays open.
    const resize_observer = new ResizeObserver(updateRect);
    resize_observer.observe(marker_el);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      resize_observer.disconnect();
    };
  }, []);

  // A tall menu opened near the bottom of the window (a group menu on a lower table, say)
  // would run off the screen with its last rows out of reach, since the panel is `fixed` and
  // the page can't scroll it back into view. Nudge it up just enough to fit. `offsetTop` and
  // `offsetHeight` ignore the nudge itself, so this settles in one pass and re-runs on scroll.
  useLayoutEffect(() => {
    const panel_el = panel_ref.current;
    if (!anchor_rect || !panel_el) return;

    const natural_top = anchor_rect.top + panel_el.offsetTop;
    const overflow = natural_top + panel_el.offsetHeight - (window.innerHeight - VIEWPORT_MARGIN);
    setShiftY(overflow > 0 ? -Math.min(overflow, Math.max(0, natural_top - VIEWPORT_MARGIN)) : 0);
  }, [anchor_rect, panel_ref]);

  return (
    <>
      <div ref={marker_ref} className="absolute inset-0" style={{ pointerEvents: "none" }} />
      {anchor_rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[1000]"
            style={{ top: anchor_rect.top, left: anchor_rect.left, width: anchor_rect.width, height: anchor_rect.height }}
          >
            <div
              ref={panel_ref}
              onClick={(e) => e.stopPropagation()}
              className={`absolute rounded-[10px] border border-boardtree-border bg-boardtree-surface text-left shadow-[0_16px_40px_rgba(30,34,55,0.20)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] ${className || ""}`}
              style={shift_y ? { ...style, transform: `translateY(${shift_y}px)` } : style}
            >
              {children}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
