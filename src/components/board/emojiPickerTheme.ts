import type { CSSProperties } from "react";

/**
 * Shared `emoji-picker-react` theming — maps the library's own CSS custom
 * properties onto this app's shell design tokens so every themed instance
 * (comment reactions/insert in `EmojiPalette`, the board view tab emoji
 * picker in `BoardViewEmojiPicker`) reads as native chrome instead of a
 * bolted-on third-party widget, in both the light and dark theme.
 */
export const EMOJI_PICKER_THEME_VARS = {
  "--epr-bg-color": "var(--color-shell-panel)",
  "--epr-dark-bg-color": "var(--color-shell-panel)",
  "--epr-category-label-bg-color": "var(--color-shell-panel)",
  "--epr-dark-category-label-bg-color": "var(--color-shell-panel)",
  "--epr-text-color": "var(--color-shell-text-secondary)",
  "--epr-dark-text-color": "var(--color-shell-text-secondary)",
  "--epr-search-input-bg-color": "var(--color-shell-hover)",
  "--epr-dark-search-input-bg-color": "var(--color-shell-hover)",
  "--epr-search-input-bg-color-active": "var(--color-shell-hover-strong)",
  "--epr-dark-search-input-bg-color-active": "var(--color-shell-hover-strong)",
  "--epr-hover-bg-color": "var(--color-shell-hover-strong)",
  "--epr-dark-hover-bg-color": "var(--color-shell-hover-strong)",
  "--epr-focus-bg-color": "var(--color-shell-hover-strong)",
  "--epr-dark-focus-bg-color": "var(--color-shell-hover-strong)",
  "--epr-highlight-color": "#00c875",
  "--epr-dark-highlight-color": "#00c875",
  "--epr-category-icon-active-color": "#00c875",
  "--epr-dark-category-icon-active-color": "#00c875",
  "--epr-search-border-color": "#00c875",
  "--epr-picker-border-color": "transparent",
  "--epr-dark-picker-border-color": "transparent",
} as CSSProperties;

/**
 * `EmojiPicker`'s root element redeclares `--epr-emoji-size`/`--epr-emoji-padding`
 * on itself, so only a same-element declaration (this class's `!important`
 * overrides in `globals.css`) can win over the library's defaults — see the
 * comment there for the full explanation, including why each caller's picker
 * width is chosen to divide evenly by the resulting grid cell size.
 */
export const EMOJI_PICKER_CLASS_NAME = "board-emoji-palette";
