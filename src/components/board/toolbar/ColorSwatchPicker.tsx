"use client";
import React, { useEffect, useRef, useState } from "react";
import { BOARD_CONDITIONAL_COLOR_PALETTE } from "./types";

export type ColorSwatchPickerProps = {
  color: string;
  onSelect: (color: string) => void;
};

/**
 * Small square swatch button that opens a 6-column color grid below it. Used by
 * Conditional coloring's per-rule color picker; reusable by any future board
 * panel that needs to assign a color from the shared Monday-style palette.
 */
const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({ color, onSelect }) => {
  const [is_open, setIsOpen] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
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
    <div ref={container_ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Choose color"
        className={`h-[30px] w-[30px] rounded-[7px] border transition-colors ${
          is_open ? "border-shell-text-muted" : "border-shell-border-strong hover:border-shell-text-muted"
        }`}
        style={{ background: color }}
      />

      {is_open && (
        <div className="absolute left-0 top-[38px] z-[211] grid w-[222px] grid-cols-6 gap-2 rounded-xl border border-shell-border-strong bg-shell-panel p-3 shadow-2xl shadow-black/50">
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
                    ? "0 0 0 2px var(--color-shell-panel), 0 0 0 4px var(--color-shell-text)"
                    : "none",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ColorSwatchPicker;
