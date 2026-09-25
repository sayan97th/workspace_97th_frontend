"use client";
import React from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { CheckIcon } from "@/icons/workspace-icons";

/** monday.com's folder palette. */
export const FOLDER_COLOR_PALETTE = [
  "#00c875",
  "#9cd326",
  "#cab641",
  "#ffcb00",
  "#fdab3d",
  "#ff642e",
  "#e2445c",
  "#ff158a",
  "#ff5ac4",
  "#a25ddc",
  "#784bd1",
  "#579bfc",
  "#0086c0",
  "#66ccff",
  "#037f4c",
  "#bb3354",
  "#7f5347",
  "#c4c4c4",
];

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
  <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={212} align="start">
    <div className="p-3">
      <div className="mb-2.5 font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">FOLDER COLOR</div>
      <div className="grid grid-cols-6 gap-2">
        {FOLDER_COLOR_PALETTE.map((hex) => {
          const is_selected = value?.toLowerCase() === hex;
          return (
            <button
              key={hex}
              type="button"
              aria-label={`Color ${hex}`}
              aria-pressed={is_selected}
              onClick={() => onChange(hex)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white transition-transform hover:scale-110"
              style={{ background: hex }}
            >
              {is_selected && <CheckIcon size={12} />}
            </button>
          );
        })}
      </div>
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
