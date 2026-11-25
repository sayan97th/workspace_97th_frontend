/**
 * The app's color palette: the original Status colors, offered by every color
 * picker (status, label, dropdown and tag options, groups, folders, the Color
 * column, Button columns, form accents) through {@link ColorSwatchGrid}, plus
 * any custom color. Auto assigned colors (a new label, a new group) walk
 * {@link PALETTE_CYCLE}, which starts with the most distinct hues so
 * neighbouring options are easy to tell apart.
 *
 * Tonk's palette replaced these colors on 2026-11-25 and was rolled back the
 * same day by client request. The API mirror, `App\Support\ColorPalette`, can
 * move colors saved during that time back (`board:remap-palette-colors`).
 */
import { hexToRgb, relativeLuminance, rgbToHex } from "./brand-theme";

export type PaletteSwatch = {
  /** Lowercase `#rrggbb`, the value stored on the record. */
  hex: string;
  /** Short human name shown in the picker caption and screen readers. */
  name: string;
};

/** The original Status palette, row by row (6 per row). */
export const PALETTE_SWATCHES: readonly PaletteSwatch[] = [
  { hex: "#2074d4", name: "Blue" },
  { hex: "#1071c4", name: "Ocean" },
  { hex: "#3a8fc9", name: "Sky" },
  { hex: "#7b3f98", name: "Plum" },
  { hex: "#7b52c9", name: "Violet" },
  { hex: "#12c46b", name: "Green" },
  { hex: "#12724a", name: "Forest" },
  { hex: "#2f9e78", name: "Jade" },
  { hex: "#f2a53c", name: "Amber" },
  { hex: "#f2662a", name: "Orange" },
  { hex: "#e04455", name: "Red" },
  { hex: "#f453b0", name: "Pink" },
  { hex: "#8a6248", name: "Brown" },
  { hex: "#3a3a3a", name: "Charcoal" },
  { hex: "#9dd6f2", name: "Light blue" },
  { hex: "#6b7189", name: "Slate" },
  { hex: "#e2b203", name: "Mustard" },
  { hex: "#c9ccd4", name: "Silver" },
];

/** The palette as plain hex values, in picker order. */
export const PALETTE_COLORS: string[] = PALETTE_SWATCHES.map((swatch) => swatch.hex);

/** Named palette colors, for code that needs one specific color. */
export const PALETTE = {
  blue: "#2074d4",
  ocean: "#1071c4",
  sky: "#3a8fc9",
  plum: "#7b3f98",
  violet: "#7b52c9",
  green: "#12c46b",
  forest: "#12724a",
  jade: "#2f9e78",
  amber: "#f2a53c",
  orange: "#f2662a",
  red: "#e04455",
  pink: "#f453b0",
  brown: "#8a6248",
  charcoal: "#3a3a3a",
  light_blue: "#9dd6f2",
  slate: "#6b7189",
  mustard: "#e2b203",
  silver: "#c9ccd4",
} as const;

/**
 * Order used when the app picks a color on its own (new option, new group, new tag):
 * contrasting hues first, quieter neutrals last.
 */
export const PALETTE_CYCLE: string[] = [
  PALETTE.green, PALETTE.amber, PALETTE.red, PALETTE.blue, PALETTE.violet, PALETTE.orange,
  PALETTE.jade, PALETTE.pink, PALETTE.sky, PALETTE.plum, PALETTE.brown, PALETTE.light_blue,
  PALETTE.forest, PALETTE.mustard, PALETTE.ocean, PALETTE.slate, PALETTE.charcoal, PALETTE.silver,
];

/** The color for the nth auto colored record, wrapping around {@link PALETTE_CYCLE}. */
export const paletteColorAt = (index: number): string =>
  PALETTE_CYCLE[((index % PALETTE_CYCLE.length) + PALETTE_CYCLE.length) % PALETTE_CYCLE.length];

/** Conditional coloring's soft tones (6 per row), light enough that cell text stays readable on them. */
export const SOFT_SWATCHES: readonly PaletteSwatch[] = [
  { hex: "#80bea4", name: "Sea green" },
  { hex: "#7fe2b9", name: "Mint" },
  { hex: "#cce891", name: "Lime" },
  { hex: "#e3d99f", name: "Khaki" },
  { hex: "#ffe47f", name: "Lemon" },
  { hex: "#fed49d", name: "Apricot" },
  { hex: "#ffd5d5", name: "Blush" },
  { hex: "#ffb9b9", name: "Salmon" },
  { hex: "#efa0ac", name: "Coral pink" },
  { hex: "#ff89c3", name: "Bubblegum" },
  { hex: "#ffabe0", name: "Orchid" },
  { hex: "#fccff8", name: "Light orchid" },
  { hex: "#baa4e7", name: "Lilac" },
  { hex: "#bd9cc3", name: "Mauve" },
  { hex: "#9f8ac8", name: "Amethyst" },
  { hex: "#a9abee", name: "Periwinkle" },
  { hex: "#8fa6c7", name: "Steel blue" },
  { hex: "#aaccfd", name: "Cornflower" },
  { hex: "#7fc1de", name: "Soft sky" },
  { hex: "#a5e4e1", name: "Aqua" },
  { hex: "#b1e4ff", name: "Ice blue" },
  { hex: "#b2cfdd", name: "Mist" },
  { hex: "#cbd5dd", name: "Cloud" },
  { hex: "#e0e0e0", name: "Light gray" },
  { hex: "#bebebe", name: "Soft silver" },
  { hex: "#989898", name: "Gray" },
  { hex: "#bea8a2", name: "Taupe" },
  { hex: "#ebb9d6", name: "Rose" },
  { hex: "#d5c9bb", name: "Sand" },
  { hex: "#ddbfb6", name: "Peach" },
  { hex: "#94baf2", name: "Soft blue" },
  { hex: "#8aabb0", name: "Sage" },
  { hex: "#ddd3fc", name: "Lavender" },
  { hex: "#d3def4", name: "Powder blue" },
  { hex: "#cdcbdb", name: "Fog" },
  { hex: "#aa9e9e", name: "Stone" },
];

export const SOFT_COLORS: string[] = SOFT_SWATCHES.map((swatch) => swatch.hex);

/** Workspace badge colors (6 per row), led by the 97th Floor red every new workspace starts with. */
export const WORKSPACE_SWATCHES: readonly PaletteSwatch[] = [
  { hex: "#e53e2e", name: "97th red" },
  { hex: "#2b7fe0", name: "Blue" },
  { hex: "#5fbee8", name: "Sky" },
  { hex: "#2fb56b", name: "Green" },
  { hex: "#e9a23b", name: "Amber" },
  { hex: "#8a63d2", name: "Violet" },
  { hex: "#db4c86", name: "Pink" },
  { hex: "#ef6c4d", name: "Coral" },
  { hex: "#1fa6a6", name: "Teal" },
  { hex: "#6e7b7d", name: "Gray" },
  { hex: "#c2410c", name: "Rust" },
  { hex: "#4338ca", name: "Indigo" },
];

const swatch_by_hex = new Map(
  [...WORKSPACE_SWATCHES, ...SOFT_SWATCHES, ...PALETTE_SWATCHES].map((swatch) => [swatch.hex, swatch] as const)
);

/** The named swatch for a stored color (any of the palettes above), or null when the color is custom. */
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

/** A color as hue (0 to 360), saturation and value (0 to 1), the axes of the custom color picker. */
export type Hsv = { hue: number; saturation: number; value: number };

export const hexToHsv = (hex: string): Hsv => {
  const [red, green, blue] = hexToRgb(hex).map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
  }
  return { hue: (hue * 60 + 360) % 360, saturation: max === 0 ? 0 : delta / max, value: max };
};

export const hsvToHex = ({ hue, saturation, value }: Hsv): string => {
  const chroma = value * saturation;
  const segment = (hue % 360) / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1 ? [chroma, second, 0]
    : segment < 2 ? [second, chroma, 0]
    : segment < 3 ? [0, chroma, second]
    : segment < 4 ? [0, second, chroma]
    : segment < 5 ? [second, 0, chroma]
    : [chroma, 0, second];
  const offset = value - chroma;
  return rgbToHex([(red + offset) * 255, (green + offset) * 255, (blue + offset) * 255]);
};

/** A typed hex ("#FDAB3D", "fdab3d", "#fa3") as lowercase `#rrggbb`, or null when it is not a color. */
export const parseHexInput = (input: string): string | null => {
  const digits = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(digits)) return `#${digits}`;
  if (/^[0-9a-f]{3}$/.test(digits)) return `#${digits.split("").map((digit) => digit + digit).join("")}`;
  return null;
};
