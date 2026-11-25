/**
 * The last custom colors a person applied in any color picker, kept in this
 * browser so a brand color typed once is one click away everywhere else.
 */
import { findPaletteSwatch } from "./color-palette";

const STORAGE_KEY = "color_picker_recent_custom";

/** One row of the 6 column grid. */
export const MAX_RECENT_CUSTOM_COLORS = 6;

const listeners = new Set<() => void>();

/** The raw stored list, a stable string snapshot for `useSyncExternalStore`. */
export const recentCustomColorsSnapshot = (): string => {
  if (typeof window === "undefined") return "[]";
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

/** Server snapshot: no recents until the browser has read storage. */
export const emptyRecentCustomColorsSnapshot = (): string => "[]";

export const parseRecentCustomColors = (snapshot: string): string[] => {
  try {
    const saved = JSON.parse(snapshot);
    return Array.isArray(saved)
      ? saved.filter((hex): hex is string => typeof hex === "string" && /^#[0-9a-f]{6}$/.test(hex)).slice(0, MAX_RECENT_CUSTOM_COLORS)
      : [];
  } catch {
    return [];
  }
};

export const readRecentCustomColors = (): string[] => parseRecentCustomColors(recentCustomColorsSnapshot());

/** Puts a custom color first (palette colors are skipped, they are already one click away). */
export const rememberCustomColor = (hex: string): void => {
  const color = hex.toLowerCase();
  if (typeof window === "undefined" || findPaletteSwatch(color)) return;
  const next_colors = [color, ...readRecentCustomColors().filter((saved) => saved !== color)].slice(0, MAX_RECENT_CUSTOM_COLORS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next_colors));
  } catch {
    // Storage full or blocked: recents are a convenience, the pick itself already happened.
  }
  listeners.forEach((listener) => listener());
};

/** For `useSyncExternalStore`: other open pickers refresh when a custom color is applied. */
export const subscribeRecentCustomColors = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
