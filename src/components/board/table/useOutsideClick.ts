"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onOutside` on the first pointerdown outside the returned ref's element.
 * Clicks inside a portaled `[data-board-menu-flyout]` layer (a color grid, a
 * "..." submenu or a confirm dialog opened from the panel) count as inside,
 * the same convention `BoardPopover` follows.
 */
export function useOutsideClick<T extends HTMLElement>(active: boolean, onOutside: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!ref.current || ref.current.contains(target)) return;
      if (target instanceof Element && target.closest("[data-board-menu-flyout]")) return;
      onOutside();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [active, onOutside]);

  return ref;
}
