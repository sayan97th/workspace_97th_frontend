"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuFlyoutProps = {
  /** The menu row that opens this flyout (e.g. the "Item height" button inside the "..." menu). */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Flyout width in pixels. Defaults to 196. */
  width?: number;
  /**
   * Which side of the anchor row the flyout opens on. Defaults to "left" — the Client Hub
   * "Item height" submenu opens toward the left so it doesn't spill past the right edge of
   * the viewport when the "..." menu sits near the toolbar's right side. Flips automatically
   * if there isn't enough room on the requested side.
   */
  side?: "left" | "right";
  children: React.ReactNode;
};

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/**
 * Side-opening nested submenu anchored to a single row inside an already-open menu (as
 * opposed to {@link BoardPopover}, which anchors to a toolbar button). Portals to
 * document.body so it can float above the table; tags its root with
 * `data-board-menu-flyout` so a parent `BoardPopover` can tell its own outside-click
 * detection to treat clicks inside this flyout as "inside". Reusable for any future
 * flyout-style submenu (e.g. a "Change theme" submenu nested in another menu).
 */
const MenuFlyout: React.FC<MenuFlyoutProps> = ({
  anchor_el,
  is_open,
  onClose,
  width = 196,
  side = "left",
  children,
}) => {
  const flyout_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!is_open || !anchor_el) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor_rect = anchor_el.getBoundingClientRect();
      const flyout_height = flyout_ref.current?.offsetHeight ?? 0;

      const left_side_left = anchor_rect.left - width - ANCHOR_GAP;
      const right_side_left = anchor_rect.right + ANCHOR_GAP;
      let left = side === "left" ? left_side_left : right_side_left;

      const fits_left = left_side_left >= VIEWPORT_MARGIN;
      const fits_right = right_side_left + width <= window.innerWidth - VIEWPORT_MARGIN;
      if (side === "left" && !fits_left && fits_right) left = right_side_left;
      if (side === "right" && !fits_right && fits_left) left = left_side_left;
      left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);

      let top = anchor_rect.top;
      if (top + flyout_height > window.innerHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - flyout_height);
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [is_open, anchor_el, width, side]);

  useLayoutEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (flyout_ref.current?.contains(target)) return;
      if (anchor_el?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
      ref={flyout_ref}
      data-board-menu-flyout
      className="fixed z-[1001] rounded-xl border border-shell-border bg-shell-panel text-shell-text shadow-2xl shadow-black/40"
      style={{
        width,
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

export default MenuFlyout;
