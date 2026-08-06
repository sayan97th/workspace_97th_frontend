/**
 * Literal palette lifted straight from `design/design_2/97 Workspace Menu.dc.html`
 * — the client's Kanban mockup. Deliberately **not** the app's adaptive
 * `shell-*` theme tokens: the mockup is a fixed light design, and the ask was
 * for it to render pixel-identical regardless of the app's own light/dark
 * theme, so every color the Kanban board/card/drawer touch is hardcoded here
 * instead of resolved through CSS custom properties. Grouped by the mock's
 * own naming (`RED`/`AMBER`/`GRAY`, the `PRIORITY` map) where it named
 * things, and by role everywhere the mock only ever inlined a hex.
 */
export const KANBAN_COLORS = {
  column_bg: "#EFEFEC",
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

  success: "#3AA76D",

  red: "#E53E2E",
  amber: "#D55B08",
  gray: "#7E8889",
  danger_bg: "#FCE9E7",
} as const;
