"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FloatingSuggestionProps = {
  getRect: (() => DOMRect | null) | null;
  width: number;
  max_height: number;
  /** Theme and surface classes of the panel, the doc look unless a host passes its own (the Rich Text composer). */
  class_name?: string;
  children: React.ReactNode;
};

const VIEWPORT_MARGIN = 8;
const GAP = 6;

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
  children,
}) => {
  const panel_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; max_height: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const rect = getRect?.();
      if (!rect) return;
      const space_below = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
      const space_above = rect.top - GAP - VIEWPORT_MARGIN;
      const panel_height = Math.min(panel_ref.current?.offsetHeight ?? max_height, max_height);
      const opens_above = space_below < Math.min(panel_height, 220) && space_above > space_below;
      const available = Math.max(160, Math.min(max_height, opens_above ? space_above : space_below));
      const shown_height = Math.min(panel_height, available);
      const top = opens_above ? rect.top - GAP - shown_height : rect.bottom + GAP;
      const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), window.innerWidth - width - VIEWPORT_MARGIN);
      // Runs after every render, so it only stores a position that actually moved.
      setPosition((current) =>
        current && current.top === top && current.left === left && current.max_height === available
          ? current
          : { top, left, max_height: available }
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
    </div>,
    document.body
  );
};

export default FloatingSuggestion;
