"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FloatingSuggestionProps = {
  getRect: (() => DOMRect | null) | null;
  width: number;
  max_height: number;
  /** Theme and surface classes of the panel, the doc look unless a host passes its own (the Rich Text composer). */
  class_name?: string;
  /**
   * Class of a small arrow drawn between the anchor and the panel, pointing at
   * the anchor (monday.com's `@mention` card). Omit for no arrow. It is its own
   * fixed element, so a panel with `overflow: hidden` never clips it.
   */
  arrow_class_name?: string;
  children: React.ReactNode;
};

const VIEWPORT_MARGIN = 8;
const GAP = 6;
/** Room left between the anchor and the panel for the arrow. */
const ARROW_GAP = 11;
/** How far the arrow's tip keeps from the panel's corners. */
const ARROW_INSET = 14;

/**
 * Fixed position panel under the caret for the "/" and "@" menus, flipped
 * above it when there is no room below and clamped inside the window.
 * Portaled to the body so no scroll container clips it. Shared by the doc
 * editor and the Rich Text composer's "/" menu.
 */
const FloatingSuggestion: React.FC<FloatingSuggestionProps> = ({
  getRect,
  width,
  max_height,
  class_name = "doc-theme doc-suggestion",
  arrow_class_name,
  children,
}) => {
  const panel_ref = useRef<HTMLDivElement>(null);
  const gap = arrow_class_name ? ARROW_GAP : GAP;
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    max_height: number;
    opens_above: boolean;
    arrow_left: number;
    anchor_top: number;
    anchor_bottom: number;
  } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const rect = getRect?.();
      if (!rect) return;
      const space_below = window.innerHeight - rect.bottom - gap - VIEWPORT_MARGIN;
      const space_above = rect.top - gap - VIEWPORT_MARGIN;
      const panel_height = Math.min(panel_ref.current?.offsetHeight ?? max_height, max_height);
      const opens_above = space_below < Math.min(panel_height, 220) && space_above > space_below;
      const available = Math.max(160, Math.min(max_height, opens_above ? space_above : space_below));
      const shown_height = Math.min(panel_height, available);
      const top = opens_above ? rect.top - gap - shown_height : rect.bottom + gap;
      // With an arrow the panel starts a little left of the anchor, so the arrow can point right at it.
      const preferred_left = arrow_class_name ? rect.left - ARROW_INSET : rect.left;
      const left = Math.min(Math.max(VIEWPORT_MARGIN, preferred_left), window.innerWidth - width - VIEWPORT_MARGIN);
      const arrow_left = Math.min(Math.max(left + ARROW_INSET - 6, rect.left + rect.width / 2 - 6), left + width - ARROW_INSET - 6);
      const next = { top, left, max_height: available, opens_above, arrow_left, anchor_top: rect.top, anchor_bottom: rect.bottom };
      // Runs after every render, so it only stores a position that actually moved.
      setPosition((current) =>
        current &&
        current.top === next.top &&
        current.left === next.left &&
        current.max_height === next.max_height &&
        current.opens_above === next.opens_above &&
        current.arrow_left === next.arrow_left
          ? current
          : next
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
    <div
      ref={panel_ref}
      className={class_name}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width,
        maxHeight: position?.max_height ?? max_height,
      }}
      // Clicks inside must not blur the editor, or the suggestion closes before the pick lands.
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </div>
    {arrow_class_name && position && (
      <span
        aria-hidden="true"
        className={arrow_class_name}
        data-side={position.opens_above ? "bottom" : "top"}
        style={{
          left: position.arrow_left,
          // The 12px square sits half over the panel's edge, its tip toward the anchor.
          top: position.opens_above ? position.anchor_top - gap - 6 : position.anchor_bottom + gap - 6,
        }}
      />
    )}
    </>,
    document.body
  );
};

export default FloatingSuggestion;
