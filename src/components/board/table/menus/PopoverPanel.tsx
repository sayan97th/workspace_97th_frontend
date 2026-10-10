"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOutsideClick } from "../useOutsideClick";

/** Gap kept between a nudged panel and the window's (or board area's) edges. */
const VIEWPORT_MARGIN = 8;
/** Below this height a capped panel is too cramped to use, so it falls back to the whole window. */
const MIN_PANEL_HEIGHT = 140;

interface PanelPlacement {
  shift_x: number;
  shift_y: number;
  /** Set only when there is no room for the whole panel, so it scrolls internally instead of overflowing. */
  max_height: number | null;
  /** True while the anchor cell is scrolled out of the board area or under a sticky header, see `isAnchorVisible`. */
  is_hidden: boolean;
}

const INITIAL_PLACEMENT: PanelPlacement = { shift_x: 0, shift_y: 0, max_height: null, is_hidden: false };

/**
 * How a panel that doesn't fit below its anchor is brought back into view.
 * - "flip": opens above the anchor when it fits there, otherwise stays on the roomier side
 *   and scrolls internally. It never covers its own cell nor leaves the board's scroll area,
 *   so the board title, view tabs and toolbar above the table stay visible.
 * - "shift": nudged up over the anchor. Kept for menus with side flyouts (Column, Group),
 *   since an internally scrolling panel would clip those flyouts.
 */
export type PopoverFit = "flip" | "shift";

interface VerticalPlacement {
  top: number;
  max_height: number | null;
}

/** Nudges the panel up just enough to fit in the window, capping it only when the window is shorter than the panel. */
function shiftIntoWindow(natural_top: number, natural_height: number): VerticalPlacement {
  const available_height = window.innerHeight - VIEWPORT_MARGIN * 2;
  const max_height = natural_height > available_height ? available_height : null;
  const visible_height = Math.min(natural_height, available_height);
  const overflow_y = natural_top + visible_height - (window.innerHeight - VIEWPORT_MARGIN);
  const shift_y = overflow_y > 0 ? -Math.min(overflow_y, Math.max(0, natural_top - VIEWPORT_MARGIN)) : 0;
  return { top: natural_top + shift_y, max_height };
}

/** Places the panel below or above its anchor, inside `bounds`, see `PopoverFit`. */
function flipWithinBounds(
  natural_top: number,
  natural_height: number,
  anchor_top: number,
  bounds: { top: number; bottom: number }
): VerticalPlacement {
  const space_below = bounds.bottom - natural_top;
  const space_above = anchor_top - bounds.top;

  if (natural_height <= space_below) return { top: natural_top, max_height: null };
  if (natural_height <= space_above) return { top: anchor_top - natural_height, max_height: null };
  if (Math.max(space_below, space_above) < MIN_PANEL_HEIGHT) return shiftIntoWindow(natural_top, natural_height);

  // Neither side fits the whole panel, so it takes the roomier one (below on a tie) and scrolls.
  if (space_below >= space_above) return { top: natural_top, max_height: space_below };
  return { top: anchor_top - space_above, max_height: space_above };
}

/**
 * Whether the anchor box can still be seen. While the table scrolls with a menu open, the cell
 * slides under the board title and toolbar, under the sticky group and column headers, or
 * behind a pinned column. The panel follows its cell, so it would end up floating over all of
 * those. The hit test at the cell's center catches every such cover in one go: skipping the
 * panel's own portal (its proxy box sits right over the cell, and the panel may overlap it in
 * "shift" mode), whatever sits on top there has to be the cell itself. Anything outside the
 * board area that is on top (a dialog opened from the menu, say) does not count as a cover.
 */
function isAnchorVisible(
  anchor_rect: DOMRect,
  anchor_el: HTMLElement | null,
  panel_el: HTMLElement,
  scroll_container: HTMLElement | null
): boolean {
  const center_x = anchor_rect.left + anchor_rect.width / 2;
  const center_y = anchor_rect.top + anchor_rect.height / 2;
  const area = scroll_container?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  if (center_x < area.left || center_x > area.right || center_y < area.top || center_y > area.bottom) return false;
  if (center_y < 0 || center_y > window.innerHeight || center_x < 0 || center_x > window.innerWidth) return false;

  const portal_el = panel_el.parentElement;
  const top_element = document.elementsFromPoint(center_x, center_y).find((element) => !portal_el?.contains(element));
  if (!top_element || !anchor_el) return true;
  if (anchor_el.contains(top_element)) return true;
  return scroll_container ? !scroll_container.contains(top_element) : true;
}

/** The closest ancestor that scrolls vertically, the board's table area for cell menus. */
function findScrollContainer(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

interface PopoverPanelProps {
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  /** See `PopoverFit`, defaults to "flip". */
  fit?: PopoverFit;
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
export default function PopoverPanel({ onClose, className, style, fit = "flip", children }: PopoverPanelProps) {
  const marker_ref = useRef<HTMLDivElement>(null);
  // The board's scrolling table area, found once on open. "flip" panels stay inside it.
  const scroll_container_ref = useRef<HTMLElement | null>(null);
  const [anchor_rect, setAnchorRect] = useState<DOMRect | null>(null);
  const panel_ref = useOutsideClick<HTMLDivElement>(true, onClose);
  // How far the panel is nudged so it stays fully inside the window, see `useLayoutEffect` below.
  const [placement, setPlacement] = useState<PanelPlacement>(INITIAL_PLACEMENT);
  // Mirrors `placement` so the clamp can strip its own nudge back out of the measured rect.
  const placement_ref = useRef<PanelPlacement>(INITIAL_PLACEMENT);
  // The panel's last uncapped height. Content that shrinks to fit a cap (the People list) can't
  // be measured at full size while capped, and reading the capped size instead would uncap it again.
  const uncapped_height_ref = useRef(0);

  useLayoutEffect(() => {
    const marker_el = marker_ref.current;
    if (!marker_el) return;

    scroll_container_ref.current = findScrollContainer(marker_el);
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

  // The panel is `fixed`, so the page can never scroll a cut off part of it back into view.
  // A menu opened on a cell near the right edge of a narrow window (the People picker's
  // "Save" button, say) or near the bottom of the window would leave its controls out of
  // reach. Nudge it left/right just enough to fit, and place it vertically as `fit` says,
  // capping its height so it scrolls internally when there is no room for all of it. The nudge is
  // subtracted from the measured rect first, so this settles in one pass, and it re-runs on
  // scroll, resize and whenever the panel's own content changes size (filtering a list, say).
  useLayoutEffect(() => {
    const panel_el = panel_ref.current;
    if (!anchor_rect || !panel_el) return;

    const clampToViewport = () => {
      const applied = placement_ref.current;
      const panel_rect = panel_el.getBoundingClientRect();
      const natural_left = panel_rect.left - applied.shift_x;
      const natural_top = panel_rect.top - applied.shift_y;
      // Uncapped, `offsetHeight` is used, since `scrollHeight` would also count any sub menu
      // flyout sticking out of it and cap the panel for no reason. While capped, the panel's
      // scroll height plus its border covers content that grew, and the remembered uncapped
      // height covers content that shrank to fit.
      if (applied.max_height === null) uncapped_height_ref.current = panel_el.offsetHeight;
      const natural_height =
        applied.max_height === null
          ? panel_el.offsetHeight
          : Math.max(uncapped_height_ref.current, panel_el.scrollHeight + (panel_el.offsetHeight - panel_el.clientHeight));

      const max_left = window.innerWidth - VIEWPORT_MARGIN - panel_rect.width;
      const clamped_left = Math.max(VIEWPORT_MARGIN, Math.min(natural_left, max_left));

      let vertical: VerticalPlacement;
      if (fit === "shift") {
        vertical = shiftIntoWindow(natural_top, natural_height);
      } else {
        const container_rect = scroll_container_ref.current?.getBoundingClientRect();
        const bounds = {
          top: Math.max(container_rect?.top ?? 0, 0) + VIEWPORT_MARGIN,
          bottom: Math.min(container_rect?.bottom ?? window.innerHeight, window.innerHeight) - VIEWPORT_MARGIN,
        };
        vertical = flipWithinBounds(natural_top, natural_height, anchor_rect.top, bounds);
      }
      const max_height = vertical.max_height;

      const next: PanelPlacement = {
        shift_x: Math.round(clamped_left - natural_left),
        shift_y: Math.round(vertical.top - natural_top),
        max_height: max_height === null ? null : Math.floor(max_height),
        is_hidden: !isAnchorVisible(anchor_rect, marker_ref.current?.parentElement ?? null, panel_el, scroll_container_ref.current),
      };
      if (
        next.shift_x === applied.shift_x &&
        next.shift_y === applied.shift_y &&
        next.max_height === applied.max_height &&
        next.is_hidden === applied.is_hidden
      ) {
        return;
      }

      placement_ref.current = next;
      setPlacement(next);
    };

    clampToViewport();
    const resize_observer = new ResizeObserver(clampToViewport);
    resize_observer.observe(panel_el);
    return () => resize_observer.disconnect();
  }, [anchor_rect, panel_ref, fit]);

  // `transform` composes with Tailwind's own `translate` utilities (e.g. `-translate-x-1/2`)
  // instead of replacing them, so the caller's centering is kept under the nudge.
  const panel_style: CSSProperties = { ...style };
  if (placement.shift_x || placement.shift_y) {
    panel_style.transform = `translate(${placement.shift_x}px, ${placement.shift_y}px)`;
  }
  if (placement.max_height !== null) {
    panel_style.maxHeight = placement.max_height;
    panel_style.overflowY = "auto";
    // A flex column lets content that opts in (`min-h-0` plus its own scroll area) shrink first,
    // so a capped panel keeps its footer buttons (People "Save") in view instead of scrolling them away.
    // Content can also react to `data-capped` (e.g. drop an inner list's own height limit, so only one area scrolls).
    panel_style.display = "flex";
    panel_style.flexDirection = "column";
    panel_style.overscrollBehavior = "contain";
  }
  // Hidden rather than closed, so an unsaved draft (People) survives and the panel comes back
  // as soon as its cell scrolls into view again. A click elsewhere still closes it as usual.
  if (placement.is_hidden) {
    panel_style.visibility = "hidden";
    panel_style.pointerEvents = "none";
  }

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
              data-capped={placement.max_height !== null || undefined}
              onClick={(e) => e.stopPropagation()}
              className={`shell-scrollbar absolute rounded-[10px] border border-boardtree-border bg-boardtree-surface text-left shadow-[0_16px_40px_rgba(30,34,55,0.20)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] ${className || ""}`}
              style={panel_style}
            >
              {children}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
