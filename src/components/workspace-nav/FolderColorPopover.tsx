"use client";
import React from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ColorSwatchGrid from "@/components/ui/color-swatch-grid/ColorSwatchGrid";
import { PALETTE_COLORS } from "@/lib/color-palette";

/** Folder colors: Tonk's palette, the same one every color picker offers. */
export const FOLDER_COLOR_PALETTE = PALETTE_COLORS;

export type FolderColorPopoverProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  /** Current color, null for the default. */
  value: string | null;
  /** Picked color, or null for "Default". */
  onChange: (color: string | null) => void;
  onClose: () => void;
};

/** Swatch grid for a sidebar folder's color, opened from the folder's "..." menu. */
const FolderColorPopover: React.FC<FolderColorPopoverProps> = ({ anchor_el, is_open, value, onChange, onClose }) => (
  <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={226} align="start">
    <div className="p-3">
      <div className="mb-2.5 font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">FOLDER COLOR</div>
      <ColorSwatchGrid
        value={value}
        onSelect={onChange}
        aria_label="Folder color"
        className="[--color-swatch-grid-surface:var(--color-shell-panel)] [--color-swatch-grid-ring:var(--color-shell-text)]"
      />
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={value === null}
        className="mt-3 w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-shell-text transition-colors hover:bg-shell-hover-strong disabled:cursor-default disabled:text-shell-text-faint disabled:hover:bg-transparent"
      >
        Default color
      </button>
    </div>
  </BoardPopover>
);

export default FolderColorPopover;
