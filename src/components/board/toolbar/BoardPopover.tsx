"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type BoardPopoverProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Popover width in pixels. Defaults to 300. */
  width?: number;
  /**
   * Horizontal anchor edge: "end" (default) aligns the popover's right edge with the
   * anchor's right edge, growing leftward — used by controls near the right side of the
   * toolbar (Sort/Hide/Group by/"..."). "start" aligns the popover's left edge with the
   * anchor's left edge, growing rightward — matches the Person filter design, which opens
   * flush against the left side of the Person button instead of covering Search/New item.
   */
  align?: "start" | "end";
  /**
   * When true, the popover's box sizes itself to its content's natural width
   * instead of being forced to `width` — `width` still caps how wide it can
   * grow and is what the open/clamp positioning math above plans around.
   * EmojiPalette's react-mode picker needs this: its compact single-row
   * quick-reaction bar is far narrower than the full searchable grid it can
   * expand into, and forcing the full `width` onto it left a slab of empty
   * popover background trailing off to the right of the row.
   */
  hug_content?: boolean;
  children: React.ReactNode;
};

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/**
 * Shared anchored popover for the board toolbar controls (Person/Sort/Hide/Group by/"...").
 * Portals to document.body and floats over the table (unlike the Filter panel, which is
 * rendered inline by BoardToolbar and pushes the table down instead).
 */
const BoardPopover: React.FC<BoardPopoverProps> = ({
  anchor_el,
  is_open,
  onClose,
  width = 300,
  align = "end",
  hug_content = false,
  children,
}) => {
  const popover_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!is_open || !anchor_el) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor_rect = anchor_el.getBoundingClientRect();
      const popover_height = popover_ref.current?.offsetHeight ?? 0;

      let top = anchor_rect.bottom + ANCHOR_GAP;
      if (top + popover_height > window.innerHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, anchor_rect.top - popover_height - ANCHOR_GAP);
      }

      let left = align === "start" ? anchor_rect.left : anchor_rect.right - width;
      left = Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN);
      left = Math.max(left, VIEWPORT_MARGIN);

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    // Content that grows/shrinks *after* this popover has already opened
    // (e.g. EmojiPalette's react-mode picker, whose compact single-row
    // quick-reaction bar expands into the full searchable grid in place)
    // doesn't change `is_open`/`anchor_el`/`width`/`align`, so the effect
    // above wouldn't otherwise rerun and reposition — leaving the popover
    // pinned wherever it was placed for its old, smaller size while the
    // new, taller content spills past the viewport edge. Watching the
    // popover's own box for resizes keeps it correctly flipped/clamped no
    // matter what causes its content to change size.
    const resize_observer = new ResizeObserver(updatePosition);
    if (popover_ref.current) resize_observer.observe(popover_ref.current);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resize_observer.disconnect();
    };
  }, [is_open, anchor_el, width, align]);

  useLayoutEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popover_ref.current?.contains(target)) return;
      if (anchor_el?.contains(target)) return;
      // A nested MenuFlyout (e.g. the "Item height" submenu) portals to document.body as a
      // sibling, so it isn't a DOM descendant of this popover. Treat clicks inside any such
      // flyout as "inside" so opening a submenu doesn't dismiss its parent menu.
      if (target instanceof Element && target.closest("[data-board-menu-flyout]")) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Stop the Escape key here so a parent dialog's own window-level Escape
      // handler (e.g. TrashModal, CreateTeamModal) doesn't also close on the same
      // keypress — this popover should be the topmost layer to dismiss.
      event.stopPropagation();
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open, anchor_el, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popover_ref}
      className="fixed z-[1000] rounded-xl border border-shell-border bg-shell-panel text-shell-text shadow-2xl shadow-black/40"
      style={{
        width: hug_content ? undefined : width,
        maxWidth: width,
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default BoardPopover;
