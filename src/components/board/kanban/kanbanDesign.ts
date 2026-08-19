/**
 * Kanban's own design tokens — a Trello/Asana-grade visual pass on top of the
 * app's real `gray-*`/`brand-*`/`success-*` palette (see `globals.css`'s
 * `@theme`), not the adaptive `shell-*` theme tokens: the board is a fixed
 * light design by intent (see `design/kanban_redesign` reference canvas), so
 * every color the Kanban board/card/drawer touch is hardcoded here instead of
 * resolved through CSS custom properties. Cards float directly on the page's
 * `shell-bg` (no boxed column panel) — depth comes entirely from each card's
 * own shadow, matching the approved redesign.
 */
export const KANBAN_COLORS = {
  /** The board's own light canvas — deliberately fixed regardless of the app shell's dark/light mode, so the board reads the same as the reference design even when the surrounding shell (`bg-shell-bg`) is dark. */
  canvas_bg: "#F4F4F1",
  card_bg: "#FFFFFF",
  border_default: "#E4E4E1",
  border_subtle: "#ECECEA",

  text_strong: "#0A1717",
  text_secondary: "#2B3C40",
  text_muted: "#546264",
  text_faint: "#7E8889",
  text_disabled: "#9AA1A1",
  text_placeholder: "#A7AEAD",
  text_faded: "#B8BEBD",
  text_hairline: "#D7DAD8",

  chip_bg: "#F4F4F2",
  hover_bg: "#E2E2DE",
  icon_default: "#A7AEAD",

  success: "#12B76A",

  red: "#E53E2E",
  amber: "#D55B08",
  blue: "#0BA5EC",
  gray: "#7E8889",
  danger_bg: "#FCE9E7",

  /** Card corner radius, in px — shared by the card shell, cover bar and drawer panel. */
  card_radius: 14,
  shadow_resting: "0 1px 2px rgba(10,23,23,0.05), 0 1px 1px rgba(10,23,23,0.03)",
  shadow_hover: "0 12px 24px rgba(10,23,23,0.10), 0 2px 6px rgba(10,23,23,0.06)",
  shadow_dragging: "0 20px 36px rgba(10,23,23,0.20)",
} as const;

/** A pill's tinted background for a given accent color — 10% alpha over white, same formula used by priority/label chips and the drawer's active priority pill. */
export const kanbanTint = (hex: string): string => `${hex}1A`;
