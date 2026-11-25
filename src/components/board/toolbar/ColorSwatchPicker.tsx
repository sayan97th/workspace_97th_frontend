"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ColorSwatchGrid from "@/components/ui/color-swatch-grid/ColorSwatchGrid";
import { PALETTE_SWATCHES, type PaletteSwatch } from "@/lib/color-palette";

export type ColorSwatchPickerProps = {
  color: string;
  onSelect: (color: string) => void;
  /** Trigger button size in pixels (it's square). Defaults to 30. */
  size?: number;
  /** Replaces the trigger's default outlined look, e.g. Edit Labels' `status-picker__swatch`. */
  trigger_class_name?: string;
  /** Glyph drawn on top of the trigger's color, e.g. a paint bucket. */
  icon?: React.ReactNode;
  /** Swatches offered in the grid. Defaults to the app palette, {@link PALETTE_SWATCHES}. */
  swatches?: readonly PaletteSwatch[];
  /** Accessible name of the grid, e.g. "Label color". */
  aria_label?: string;
};

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

/**
 * Small square swatch button that opens the app palette ({@link ColorSwatchGrid})
 * in a floating card. The card portals to `document.body` (fixed-positioned off
 * the button's own bounding rect) rather than rendering as an absolutely
 * positioned child, since a plain absolute child gets clipped whenever this
 * picker sits inside a scrolling/overflow-hidden ancestor, as
 * {@link "../cells/EditLabelsPanel"}'s scrollable label list does. Tags its root
 * with `data-board-menu-flyout` so a parent `BoardPopover` doesn't treat a click
 * inside the grid as "outside" and dismiss itself (same convention as
 * `MenuFlyout`). Used by Edit Labels (Status, Label, Dropdown) and Conditional
 * coloring.
 */
const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  color,
  onSelect,
  size = 30,
  trigger_class_name,
  icon,
  swatches = PALETTE_SWATCHES,
  aria_label = "Colors",
}) => {
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
      const grid_width = grid_ref.current?.offsetWidth ?? 0;

      let top = anchor_rect.bottom + ANCHOR_GAP;
      if (top + grid_height > window.innerHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, anchor_rect.top - grid_height - ANCHOR_GAP);
      }

      let left = anchor_rect.left;
      left = Math.min(left, window.innerWidth - grid_width - VIEWPORT_MARGIN);
      left = Math.max(left, VIEWPORT_MARGIN);

      setPosition({ top, left });
    };

    updatePosition();
    // The card changes height when the grid swaps to its Custom color view.
    const resize_observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    if (grid_ref.current) resize_observer?.observe(grid_ref.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      resize_observer?.disconnect();
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
      if (event.key !== "Escape") return;
      // Keep the Escape here so the enclosing panel (Conditional coloring, Edit Labels) stays open.
      event.stopPropagation();
      setIsOpen(false);
      button_ref.current?.focus();
    };

    document.addEventListener("mousedown", handlePointerDown);
    // Capture phase, so this runs before BoardPopover's own document-level Escape handler.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [is_open]);

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Choose color"
        aria-expanded={is_open}
        data-open={is_open || undefined}
        className={
          trigger_class_name ??
          `flex-none rounded-[7px] border transition-colors ${
            is_open ? "border-boardtree-text-muted" : "border-boardtree-border hover:border-boardtree-text-muted"
          }`
        }
        style={{ background: color, height: size, width: size }}
      >
        {icon}
      </button>

      {is_open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={grid_ref}
            data-board-menu-flyout
            className="color-swatch-popover"
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              visibility: position ? "visible" : "hidden",
            }}
          >
            <ColorSwatchGrid
              value={color}
              swatches={swatches}
              aria_label={aria_label}
              auto_focus
              onSelect={(hex) => {
                onSelect(hex);
                setIsOpen(false);
                button_ref.current?.focus();
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
};

export default ColorSwatchPicker;
