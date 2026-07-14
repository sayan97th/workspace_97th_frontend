import React from "react";
import type { BoardColumnSwatch } from "./types";

export type ColumnSwatchBadgeProps = {
  swatch: BoardColumnSwatch;
  size?: number;
};

/**
 * Small colour + glyph badge identifying a column, e.g. in the Sort/Group-by
 * column pickers. Shared so every column picker across the board toolbar
 * renders columns identically.
 */
const ColumnSwatchBadge: React.FC<ColumnSwatchBadgeProps> = ({ swatch, size = 21 }) => (
  <span
    className="flex flex-none items-center justify-center rounded-[5px] text-[11px] font-bold leading-none"
    style={{
      width: size,
      height: size,
      background: swatch.accent_color,
      color: swatch.glyph_text_color ?? "#ffffff",
    }}
  >
    {swatch.glyph}
  </span>
);

export default ColumnSwatchBadge;
