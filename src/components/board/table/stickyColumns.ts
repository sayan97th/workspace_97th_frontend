"use client";
import { createContext, useContext, type CSSProperties } from "react";

/**
 * Whether the table freezes its leading cells (checkbox, Item name, comment
 * icon, pinned columns) while it scrolls sideways. On by default; `BoardTable`
 * turns it off on phones, where any frozen column takes most of the screen and
 * hides the values next to it. The whole row then scrolls as one.
 */
export const StickyColumnsContext = createContext<boolean>(true);

export const useStickyColumns = (): boolean => useContext(StickyColumnsContext);

/**
 * Inline style for a frozen cell. With freezing off the cell stays
 * `position: relative`, so its `zIndex` and any absolutely positioned child
 * (resize handle, hover buttons) keep working exactly as before.
 */
export function stickyCellStyle(is_sticky: boolean, left: number | undefined): CSSProperties {
  return is_sticky ? { position: "sticky", left } : { position: "relative" };
}
