"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BOARD_CONDITIONAL_COLOR_PALETTE } from "./types";

export type ColorSwatchPickerProps = {
  color: string;
  onSelect: (color: string) => void;
};

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;
const GRID_WIDTH = 222;

/**
 * Small square swatch button that opens a 6-column color grid. The grid
 * portals to `document.body` (fixed-positioned off the button's own
 * bounding rect) rather than rendering as an absolutely-positioned child —
 * a plain absolute child gets clipped whenever this picker sits inside a
 * scrolling/overflow-hidden ancestor, as {@link "../cells/EditLabelsPanel"}'s
 * scrollable label list does. Tags its root with `data-board-menu-flyout` so
 * a parent `BoardPopover` doesn't treat a click inside the grid as "outside"
 * and dismiss itself (same convention as `MenuFlyout`). Used by Conditional
 * coloring's per-rule color picker and Edit Labels' per-label recolor swatch.
 */
const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({ color, onSelect }) => {
  const [is_open, setIsOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);
  const grid_ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!is_open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor_rect = button_ref.current?.getBoundingClientRect();
      if (!anchor_rect) return;
      const grid_height = grid_ref.current?.offsetHeight ?? 0;

      let top = anchor_rect.bottom + ANCHOR_GAP;
      if (top + grid_height > window.innerHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, anchor_rect.top - grid_height - ANCHOR_GAP);
      }

      let left = anchor_rect.left;
      left = Math.min(left, window.innerWidth - GRID_WIDTH - VIEWPORT_MARGIN);
      left = Math.max(left, VIEWPORT_MARGIN);

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [is_open]);

  useLayoutEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (grid_ref.current?.contains(target)) return;
      if (button_ref.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open]);

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Choose color"
        className={`h-[30px] w-[30px] flex-none rounded-[7px] border transition-colors ${
          is_open ? "border-boardtree-text-muted" : "border-boardtree-border hover:border-boardtree-text-muted"
        }`}
        style={{ background: color }}
      />

      {is_open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={grid_ref}
            data-board-menu-flyout
            className="fixed z-[1001] grid grid-cols-6 gap-2 rounded-xl border border-boardtree-border bg-boardtree-surface p-3 shadow-2xl shadow-black/50"
            style={{
              width: GRID_WIDTH,
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {BOARD_CONDITIONAL_COLOR_PALETTE.map((hex) => {
              const is_selected = hex.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Color ${hex}`}
                  onClick={() => {
                    onSelect(hex);
                    setIsOpen(false);
                  }}
                  className="h-[26px] w-[26px] rounded-md"
                  style={{
                    background: hex,
                    boxShadow: is_selected
                      ? "0 0 0 2px var(--color-boardtree-surface), 0 0 0 4px var(--color-boardtree-text)"
                      : "none",
                  }}
                />
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};

export default ColorSwatchPicker;
