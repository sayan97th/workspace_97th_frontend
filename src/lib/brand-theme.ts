/**
 * Runtime brand theming for Administration > Organization > Brand color.
 *
 * Tailwind v4 compiles every `bg-brand-500`, `text-brand-200`, `border-brand-500/30`... utility
 * to `var(--color-brand-*)`, so repainting the whole app only takes redeclaring that scale on
 * `<html>`. The scale is derived from one hex by mixing it with white (lighter steps) and black
 * (darker steps), the same shape as the default red scale in `globals.css`.
 */

/** The default 97th Floor red, `--color-brand-500` in `globals.css`. */
export const DEFAULT_BRAND_COLOR = "#e53e2e";

/** localStorage key read by the root layout's bootstrap script, so a returning visitor never sees the default red flash. */
export const BRAND_PALETTE_STORAGE_KEY = "organization_brand_palette";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** How far each step moves toward white (positive) or black (negative). 500 is the color itself. */
const BRAND_SCALE_STEPS: Record<string, number> = {
  "25": 0.95,
  "50": 0.88,
  "100": 0.76,
  "200": 0.45,
  "300": 0.28,
  "400": 0.14,
  "500": 0,
  "600": -0.2,
  "700": -0.4,
  "800": -0.6,
  "900": -0.8,
  "950": -0.9,
};

type Rgb = [number, number, number];

export const isHexColor = (value: string | null | undefined): value is string =>
  typeof value === "string" && HEX_COLOR_PATTERN.test(value);

const hexToRgb = (hex: string): Rgb => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = (rgb: Rgb): string =>
  `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

const mixRgb = (from: Rgb, to: Rgb, amount: number): Rgb =>
  [0, 1, 2].map((index) => from[index] + (to[index] - from[index]) * amount) as Rgb;

/** Every `--color-brand-*` custom property for the given hex. */
export const buildBrandPalette = (hex: string): Record<string, string> => {
  const base = hexToRgb(hex);
  return Object.fromEntries(
    Object.entries(BRAND_SCALE_STEPS).map(([step, amount]) => {
      const target: Rgb = amount >= 0 ? [255, 255, 255] : [0, 0, 0];
      return [`--color-brand-${step}`, rgbToHex(mixRgb(base, target, Math.abs(amount)))];
    })
  );
};

/** WCAG relative luminance of a hex color. */
const relativeLuminance = (hex: string): number => {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** WCAG contrast ratio of white text on the given background, from 1 to 21. */
export const contrastWithWhite = (hex: string): number => 1.05 / (relativeLuminance(hex) + 0.05);

/** WCAG AA for bold UI text (buttons) asks for at least 3:1, body text 4.5:1. */
export const MIN_BUTTON_CONTRAST = 3;

/**
 * Applies (or, with null, removes) the brand scale on `<html>` and remembers it for the next
 * page load. A null or invalid color falls back to the stylesheet's default red.
 */
export const applyBrandColor = (hex: string | null): void => {
  if (typeof document === "undefined") return;
  const root_style = document.documentElement.style;
  const palette = isHexColor(hex) && hex.toLowerCase() !== DEFAULT_BRAND_COLOR ? buildBrandPalette(hex) : null;

  for (const step of Object.keys(BRAND_SCALE_STEPS)) {
    const property = `--color-brand-${step}`;
    if (palette) root_style.setProperty(property, palette[property]);
    else root_style.removeProperty(property);
  }

  try {
    if (palette) localStorage.setItem(BRAND_PALETTE_STORAGE_KEY, JSON.stringify(palette));
    else localStorage.removeItem(BRAND_PALETTE_STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode), the palette still applies for this page view.
  }
};

/**
 * Points every `<link rel="icon">` at the organization favicon, or restores the default
 * `/favicon.ico` Next.js emitted when `favicon_url` is null.
 */
export const applyFavicon = (favicon_url: string | null): void => {
  if (typeof document === "undefined") return;
  const icon_links = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];

  if (icon_links.length === 0 && favicon_url) {
    const icon_link = document.createElement("link");
    icon_link.rel = "icon";
    document.head.appendChild(icon_link);
    icon_links.push(icon_link);
  }

  for (const icon_link of icon_links) {
    if (icon_link.dataset.default_href === undefined) {
      icon_link.dataset.default_href = icon_link.getAttribute("href") ?? "";
    }
    const next_href = favicon_url ?? icon_link.dataset.default_href;
    if (next_href) icon_link.href = next_href;
    // The sizes/type Next.js set describe the default .ico, not an uploaded PNG.
    if (favicon_url) {
      icon_link.removeAttribute("sizes");
      icon_link.removeAttribute("type");
    }
  }
};

/**
 * Inline script for the root layout that repaints the saved brand scale before hydration.
 * Must stay in sync with {@link BRAND_PALETTE_STORAGE_KEY}.
 */
export const brand_palette_bootstrap_script = `(function(){try{var saved_palette=JSON.parse(localStorage.getItem("${BRAND_PALETTE_STORAGE_KEY}")||"null");if(saved_palette){for(var property in saved_palette){if(property.indexOf("--color-brand-")===0)document.documentElement.style.setProperty(property,saved_palette[property]);}}}catch(error){}})();`;
