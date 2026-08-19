/**
 * Kanban's own design tokens — a Trello/Asana-grade visual pass on top of the
 * app's real `gray-*`/`brand-*`/`success-*` palette (see `globals.css`'s
 * `@theme`). Neutral surface/text/border values resolve through the same
 * adaptive `--color-shell-*` custom properties every other board view uses
 * (light defaults in `@theme`, dark overrides under `.dark`), so the board
 * repaints for dark mode along with the rest of the shell instead of staying
 * pinned to one fixed light palette. Saturated accent colors (success/danger/
 * priority swatches) hold contrast in both themes and are left as plain hex.
 */
export const KANBAN_COLORS = {
  canvas_bg: "var(--color-shell-panel-alt)",
  card_bg: "var(--color-shell-panel)",
  border_default: "var(--color-shell-border-strong)",
  border_subtle: "var(--color-shell-border)",

  text_strong: "var(--color-shell-text)",
  text_secondary: "var(--color-shell-text)",
  text_muted: "var(--color-shell-text-secondary)",
  text_faint: "var(--color-shell-text-muted)",
  text_disabled: "var(--color-shell-text-muted)",
  text_placeholder: "var(--color-shell-text-faint)",
  text_faded: "var(--color-shell-text-faint)",
  text_hairline: "var(--color-shell-border-strong)",

  chip_bg: "var(--color-shell-hover)",
  hover_bg: "var(--color-shell-hover-strong)",
  icon_default: "var(--color-shell-text-faint)",

  success: "#12B76A",

  red: "#E53E2E",
  amber: "#D55B08",
  blue: "#0BA5EC",
  gray: "var(--color-shell-text-muted)",
  danger_bg: "rgba(229, 62, 46, 0.14)",

  /** Card corner radius, in px — shared by the card shell, cover bar and drawer panel. */
  card_radius: 14,
  shadow_resting: "0 1px 2px rgba(10,23,23,0.05), 0 1px 1px rgba(10,23,23,0.03)",
  shadow_hover: "0 12px 24px rgba(10,23,23,0.10), 0 2px 6px rgba(10,23,23,0.06)",
  shadow_dragging: "0 20px 36px rgba(10,23,23,0.20)",
} as const;

/** A pill's tinted background for a given accent color — ~15% alpha, legible over both the light and dark card surface, same formula used by priority/label chips and the drawer's active priority pill. */
export const kanbanTint = (hex: string): string => `${hex}26`;
