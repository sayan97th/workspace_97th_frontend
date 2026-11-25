/**
 * The app's one color palette, designed by Tonk for 97th Floor.
 *
 * Every surface that lets a person pick a color (status, label, dropdown and tag
 * options, groups, folders, the Color column, Button columns, form accents,
 * workspace badges) offers these 18 swatches, in this order, through
 * {@link ColorSwatchGrid}. Auto assigned colors (a new label, a new group) walk
 * {@link PALETTE_CYCLE}, which starts with the most distinct hues so
 * neighbouring options are easy to tell apart.
 *
 * Mirrored on the API in `App\Support\ColorPalette`; keep both in sync.
 */
import { hexToRgb, mixRgb, relativeLuminance, rgbToHex } from "./brand-theme";

export type PaletteSwatch = {
  /** Lowercase `#rrggbb`, the value stored on the record. */
  hex: string;
  /** Short human name shown in the picker caption and screen readers. */
  name: string;
};

/** Tonk's palette, row by row (6 per row). */
export const PALETTE_SWATCHES: readonly PaletteSwatch[] = [
  { hex: "#e53e2e", name: "Red" },
  { hex: "#800f12", name: "Crimson" },
  { hex: "#ab350d", name: "Rust" },
  { hex: "#d55b08", name: "Orange" },
  { hex: "#e29703", name: "Amber" },
  { hex: "#567460", name: "Moss" },
  { hex: "#60943f", name: "Green" },
  { hex: "#8fac87", name: "Sage" },
  { hex: "#8cd1cb", name: "Aqua" },
  { hex: "#0499b1", name: "Teal" },
  { hex: "#2c6776", name: "Deep teal" },
  { hex: "#2783c5", name: "Blue" },
  { hex: "#e697b2", name: "Rose" },
  { hex: "#9a7ab6", name: "Lavender" },
  { hex: "#7f2b81", name: "Plum" },
  { hex: "#c9b893", name: "Sand" },
  { hex: "#7e8889", name: "Slate" },
  { hex: "#2b3c40", name: "Charcoal" },
];

/** The palette as plain hex values, in picker order. */
export const PALETTE_COLORS: string[] = PALETTE_SWATCHES.map((swatch) => swatch.hex);

/** Named palette colors, for defaults that carry meaning (Done is green, Stuck is red). */
export const PALETTE = {
  red: "#e53e2e",
  crimson: "#800f12",
  rust: "#ab350d",
  orange: "#d55b08",
  amber: "#e29703",
  moss: "#567460",
  green: "#60943f",
  sage: "#8fac87",
  aqua: "#8cd1cb",
  teal: "#0499b1",
  deep_teal: "#2c6776",
  blue: "#2783c5",
  rose: "#e697b2",
  lavender: "#9a7ab6",
  plum: "#7f2b81",
  sand: "#c9b893",
  slate: "#7e8889",
  charcoal: "#2b3c40",
} as const;

/**
 * Order used when the app picks a color on its own (new option, new group, new tag):
 * contrasting hues first, quieter neutrals last.
 */
export const PALETTE_CYCLE: string[] = [
  PALETTE.green, PALETTE.amber, PALETTE.red, PALETTE.blue, PALETTE.plum, PALETTE.orange,
  PALETTE.teal, PALETTE.rose, PALETTE.moss, PALETTE.lavender, PALETTE.rust, PALETTE.aqua,
  PALETTE.deep_teal, PALETTE.sand, PALETTE.crimson, PALETTE.sage, PALETTE.slate, PALETTE.charcoal,
];

/** The color for the nth auto colored record, wrapping around {@link PALETTE_CYCLE}. */
export const paletteColorAt = (index: number): string =>
  PALETTE_CYCLE[((index % PALETTE_CYCLE.length) + PALETTE_CYCLE.length) % PALETTE_CYCLE.length];

/** How far a tint moves toward white. Light enough that dark cell text stays readable on it. */
const TINT_AMOUNT = 0.6;

/** A light tint of a palette color, used where the color sits behind text (Conditional coloring). */
export const tintColor = (hex: string, amount = TINT_AMOUNT): string =>
  rgbToHex(mixRgb(hexToRgb(hex), [255, 255, 255], amount));

/** Soft tints of every palette color, same order and names, for Conditional coloring. */
export const PALETTE_TINT_SWATCHES: readonly PaletteSwatch[] = PALETTE_SWATCHES.map((swatch) => ({
  hex: tintColor(swatch.hex),
  name: `Light ${swatch.name.toLowerCase()}`,
}));

export const PALETTE_TINT_COLORS: string[] = PALETTE_TINT_SWATCHES.map((swatch) => swatch.hex);

const swatch_by_hex = new Map(
  [...PALETTE_SWATCHES, ...PALETTE_TINT_SWATCHES].map((swatch) => [swatch.hex, swatch] as const)
);

/** The palette swatch for a stored color, or null when the color is custom (or from the old palette). */
export const findPaletteSwatch = (hex: string | null | undefined): PaletteSwatch | null =>
  hex ? swatch_by_hex.get(hex.toLowerCase()) ?? null : null;

/** True when two hex colors are the same, ignoring case. */
export const isSameColor = (first: string | null | undefined, second: string | null | undefined): boolean =>
  !!first && !!second && first.toLowerCase() === second.toLowerCase();

const DARK_GLYPH = "#1f2a2d";

/** Glyph color (check mark, icons) with the higher WCAG contrast on top of the given swatch. */
export const glyphColorOn = (hex: string): string => {
  const luminance = relativeLuminance(hex);
  const contrast_with_white = 1.05 / (luminance + 0.05);
  const contrast_with_dark = (luminance + 0.05) / (relativeLuminance(DARK_GLYPH) + 0.05);
  return contrast_with_dark > contrast_with_white ? DARK_GLYPH : "#ffffff";
};
