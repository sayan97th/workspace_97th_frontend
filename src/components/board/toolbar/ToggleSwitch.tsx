import React from "react";

export type ToggleSwitchProps = {
  is_on: boolean;
  /** Track/knob dimensions. Defaults to "md" (34x20), matching the Pin columns picker. */
  size?: "sm" | "md";
};

const TRACK_SIZES: Record<NonNullable<ToggleSwitchProps["size"]>, { width: number; height: number; knob: number }> = {
  sm: { width: 30, height: 18, knob: 14 },
  md: { width: 34, height: 20, knob: 16 },
};

/**
 * Presentational on/off switch glyph shared by the board toolbar's toggle-driven
 * pickers (e.g. Pin columns). The parent button owns the click handler and the
 * accessible label, so this component only renders the track + knob.
 */
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ is_on, size = "md" }) => {
  const { width, height, knob } = TRACK_SIZES[size];
  const inset = (height - knob) / 2;

  return (
    <span
      className="relative flex-none rounded-full transition-colors duration-150"
      style={{ width, height, background: is_on ? "#00c875" : "var(--color-shell-hover-strong)" }}
    >
      <span
        className="absolute rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-[left] duration-150"
        style={{ width: knob, height: knob, top: inset, left: is_on ? width - knob - inset : inset }}
      />
    </span>
  );
};

export default ToggleSwitch;
