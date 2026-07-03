import React from "react";

export type StatusPillProps = {
  label: string;
  /** Solid background colour of the pill. */
  bg: string;
  /** Text colour that reads well on top of {@link bg}. */
  color: string;
};

/**
 * Full-bleed status cell used inside a board's `bleed` column. It fills the
 * whole cell with a solid colour, mirroring Monday's status columns.
 */
const StatusPill: React.FC<StatusPillProps> = ({ label, bg, color }) => (
  <div
    className="flex h-full w-full items-center justify-center text-center text-[12.5px] font-semibold"
    style={{ backgroundColor: bg, color }}
  >
    {label}
  </div>
);

export default StatusPill;
