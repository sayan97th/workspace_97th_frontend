"use client";
import React, { useMemo } from "react";
import EmojiPicker, { EmojiStyle, SuggestionMode, Theme, type EmojiClickData } from "emoji-picker-react";
import BoardPopover from "../toolbar/BoardPopover";
import { useTheme } from "@/context/ThemeContext";
import { getQuickReactionUnifiedIds, recordReactionUsage } from "./reactionFrequency";

export type EmojiPaletteProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  /** "react" opens straight into a Slack-style single-row quick-reaction bar with a "+" to expand into the full picker; "insert" (default) opens straight into the full searchable, categorized picker. */
  mode?: "insert" | "react";
};

/**
 * Chosen so the emoji grid divides evenly: {@link EMOJI_SIZE_OVERRIDE_CLASS_NAME}'s
 * overrides in `globals.css` set the emoji cell to 28px (20px + 4px padding on
 * each side) and the category row's side padding to 12px each; `340 - 8` (this
 * wrapper's own padding) `- 24` (that side padding) `= 308`, which is exactly
 * `28 * 11`. Changing either the picker width or those overrides without
 * re-checking this division reintroduces a leftover strip at the end of each row.
 */
const PICKER_WIDTH = 340;

/**
 * Used for both modes, not just "insert" — the library only *ignores* our
 * `height`/`width` props while it's showing `react` mode's compact
 * single-row quick-reaction bar (it lets that row size itself to its own
 * content instead); the moment that bar is expanded into the full grid
 * (via its own "+" button), it starts applying whatever `height` we passed.
 * Passing `"auto"` there (as this used to) breaks the grid's internal
 * `flex: 1; overflow-y: scroll` body — with no definite height to
 * distribute, the flex item can't compute a max-height to scroll within,
 * so the *entire* unscrolled emoji list renders at full natural height and
 * the popover balloons far past the viewport instead of scrolling. A fixed
 * height keeps the compact bar unaffected and gives the expanded grid a
 * real, scrollable bound.
 */
const PICKER_HEIGHT = 400;

/**
 * Maps the picker's own CSS custom properties onto this app's shell design
 * tokens so it reads as native chrome instead of a bolted-on third-party
 * widget, in both the light and dark theme.
 */
const themedPickerStyle = {
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
} as React.CSSProperties;

/**
 * `EmojiPicker`'s root element redeclares `--epr-emoji-size`/`--epr-emoji-padding`
 * on *itself* (its own `baseVariables` class, applied to the same node this
 * class name lands on via the `className` prop below) — an explicit
 * declaration on an element always wins over a value merely inherited from
 * an ancestor, no matter how that ancestor set it, so putting these in
 * {@link themedPickerStyle} on our wrapping `div` had no effect; the picker
 * rendered at its 30px/5px defaults regardless. The `!important` overrides
 * for this class (in `globals.css`) are what actually make a same-element
 * declaration win. Slack's own grid runs noticeably smaller and denser than
 * that default.
 */
const EMOJI_SIZE_OVERRIDE_CLASS_NAME = "board-emoji-palette";

/**
 * Anchored emoji popover reused both for inserting an emoji into a
 * composer/reply draft and for reacting to a posted comment or reply — a
 * themed wrapper around `emoji-picker-react`'s full, searchable, categorized
 * picker library (thousands of emoji, skin tones, recently-used) instead of
 * a small hand-picked grid. In `react` mode it opens in the library's
 * built-in "Reactions" layout: a single quick-pick row plus a `+` button
 * that expands into the same full picker, mirroring Slack/Discord's
 * quick-react-then-expand pattern. That row starts out as Slack's own
 * default lineup and reorders itself around whichever emoji this user
 * actually reacts with most (tracked client-side, see
 * {@link reactionFrequency}); the full picker's own "Frequently Used"
 * category does the same for every emoji, insert or react alike. Portals
 * via {@link BoardPopover}, which also supplies outside-click/Escape-to-close
 * and viewport-aware positioning — this popover no longer risks being
 * clipped by the drawer's scroll container the way the old
 * `position: absolute` grid could.
 */
const EmojiPalette: React.FC<EmojiPaletteProps> = ({ anchor_el, is_open, onClose, onPick, mode = "insert" }) => {
  const { resolved_theme } = useTheme();

  // Re-read each time the popover opens, so a reaction picked a moment ago
  // (in this same session) is already reflected the next time it's opened.
  const quick_reactions = useMemo(
    () => (mode === "react" && is_open ? getQuickReactionUnifiedIds() : undefined),
    [mode, is_open]
  );

  const handlePick = (data: EmojiClickData) => {
    if (mode === "react") recordReactionUsage(data.emoji);
    onPick(data.emoji);
    onClose();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={PICKER_WIDTH} align="start">
      <div style={themedPickerStyle} className="overflow-hidden rounded-xl p-1">
        <EmojiPicker
          className={EMOJI_SIZE_OVERRIDE_CLASS_NAME}
          theme={resolved_theme === "dark" ? Theme.DARK : Theme.LIGHT}
          emojiStyle={EmojiStyle.NATIVE}
          onEmojiClick={handlePick}
          onReactionClick={handlePick}
          reactionsDefaultOpen={mode === "react"}
          reactions={quick_reactions}
          allowExpandReactions
          suggestedEmojisMode={SuggestionMode.FREQUENT}
          previewConfig={{ showPreview: false }}
          searchPlaceholder="Search emoji"
          width={PICKER_WIDTH - 8}
          height={PICKER_HEIGHT}
          lazyLoadEmojis
        />
      </div>
    </BoardPopover>
  );
};

export default EmojiPalette;
