import React from "react";

export type StatusPillProps = {
  label: string;
  /** Solid background colour of the pill (or the tint and text colour when `variant="outline"`). */
  bg: string;
  /** Text colour that reads well on top of {@link bg} (solid variant only). */
  color: string;
  /**
   * `"solid"` (default) fills the whole cell edge-to-edge, mirroring a
   * Status column. `"outline"` renders a small rounded, borderless tinted
   * pill instead, used for Priority style status columns (see
   * `BoardColumn.pill_style`).
   */
  variant?: "solid" | "outline";
};

/**
 * Status cell used inside a board's `bleed` column, matching the design's
 * two pill treatments: a full-bleed solid fill for Status columns, or a
 * compact rounded pill for Priority style ones.
 */
const StatusPill: React.FC<StatusPillProps> = ({ label, bg, color, variant = "solid" }) => {
  if (variant === "outline") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span
          className="rounded-full px-3 py-1 text-[11.5px] font-medium"
          style={{ color: bg, background: `color-mix(in srgb, ${bg} 8%, var(--color-boardtree-surface))` }}
        >
          {label}
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center text-center text-[12.5px] font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </div>
  );
};

export default StatusPill;
