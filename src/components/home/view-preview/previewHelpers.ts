import type React from "react";

/** monday group colors, used when a group or series has no color of its own. */
export const PREVIEW_PALETTE = ["#579bfc", "#00c875", "#a25ddc", "#fdab3d", "#ff158a", "#66ccff"];

/** The color of the `index`th group or series, its own when set. */
export const paletteColor = (color: string | null | undefined, index: number): string =>
  color || PREVIEW_PALETTE[index % PREVIEW_PALETTE.length];

/** Typed helper for CSS custom properties in a `style` prop. */
export const cssVars = (vars: Record<`--${string}`, string | number>): React.CSSProperties => vars as React.CSSProperties;

/** A fraction (0 to 1) as a CSS percentage. */
export const percent = (fraction: number): string => `${Math.round(Math.min(1, Math.max(0, fraction)) * 1000) / 10}%`;

/** Short number for tiny labels: 1200 reads as 1.2k. */
export const compactNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

/** A `conic-gradient` that draws each value as a slice in its color. */
export const conicSlices = (slices: Array<{ value: number; color: string }>): string => {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  if (total <= 0) return "conic-gradient(var(--vp-bar) 0 100%)";

  let start = 0;
  const stops = slices.map((slice) => {
    const end = start + (Math.max(0, slice.value) / total) * 100;
    const stop = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
};
