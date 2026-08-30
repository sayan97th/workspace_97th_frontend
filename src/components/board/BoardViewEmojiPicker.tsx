"use client";
import React from "react";
import EmojiPicker, { EmojiStyle, SuggestionMode, Theme, type EmojiClickData } from "emoji-picker-react";
import BoardPopover from "./toolbar/BoardPopover";
import { useTheme } from "@/context/ThemeContext";
import { EMOJI_PICKER_CLASS_NAME, EMOJI_PICKER_THEME_VARS } from "./emojiPickerTheme";

export type BoardViewEmojiPickerProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  current_emoji: string | null;
  onSelect: (emoji: string | null) => void;
};

/** Matches `EmojiPalette`'s own picker box — see its `PICKER_WIDTH` doc comment for why this exact value keeps the grid's columns edge-to-edge. */
const PICKER_WIDTH = 340;
const PICKER_HEIGHT = 400;

/**
 * Emoji grid opened from a tab's glyph — lets any board view (Client Hub's
 * real tabs and the generic `TableBoardView` engine's) carry an emoji instead
 * of the fixed icon set the old `BoardViewIconPicker` offered, so a tab is as
 * easy to tell apart at a glance as a Slack channel or a Notion page. Reuses
 * `emoji-picker-react`'s full, searchable, categorized library (the same one
 * {@link import("./drawer/EmojiPalette").default} wraps for comment
 * reactions/inserts) themed via `./emojiPickerTheme`, so both pickers look
 * like one native widget rather than two bolted-on third-party ones. Shares
 * `BoardPopover` with the rest of the toolbar's controls for consistent
 * anchor positioning, outside-click and Escape handling.
 */
const BoardViewEmojiPicker: React.FC<BoardViewEmojiPickerProps> = ({
  anchor_el,
  is_open,
  onClose,
  current_emoji,
  onSelect,
}) => {
  const { resolved_theme } = useTheme();

  const handlePick = (data: EmojiClickData) => {
    onSelect(data.emoji);
    onClose();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={PICKER_WIDTH} align="start">
      <div className="p-1">
        <div className="flex items-center justify-between px-2 pb-1.5 pt-1.5">
          <span className="font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">TAB EMOJI</span>
          {current_emoji && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className="text-[11.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
            >
              Remove
            </button>
          )}
        </div>
        <div style={EMOJI_PICKER_THEME_VARS} className="overflow-hidden rounded-xl">
          <EmojiPicker
            className={EMOJI_PICKER_CLASS_NAME}
            theme={resolved_theme === "dark" ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            onEmojiClick={handlePick}
            suggestedEmojisMode={SuggestionMode.FREQUENT}
            previewConfig={{ showPreview: false }}
            searchPlaceholder="Search emoji"
            width={PICKER_WIDTH - 8}
            height={PICKER_HEIGHT}
            lazyLoadEmojis
          />
        </div>
      </div>
    </BoardPopover>
  );
};

export default BoardViewEmojiPicker;
