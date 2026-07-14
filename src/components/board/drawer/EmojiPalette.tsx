import React from "react";
import { DRAWER_EMOJI_OPTIONS } from "./types";

export type EmojiPaletteProps = {
  onPick: (emoji: string) => void;
  /** Positions the popover above (composer/reply triggers) or below (reaction trigger) the anchor. */
  placement?: "above" | "below";
};

/**
 * Small emoji grid popover reused both for inserting an emoji into a composer/reply
 * draft and for reacting to a posted comment or reply. Must be rendered inside a
 * `position: relative` anchor (the trigger button).
 */
const EmojiPalette: React.FC<EmojiPaletteProps> = ({ onPick, placement = "above" }) => (
  <div
    onClick={(event) => event.stopPropagation()}
    className={`absolute left-0 z-[6] flex w-[236px] flex-wrap gap-[3px] rounded-xl border border-white/[0.12] bg-[#0f1c1c] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.5)] ${
      placement === "above" ? "bottom-[36px]" : "top-[38px]"
    }`}
  >
    {DRAWER_EMOJI_OPTIONS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        onClick={() => onPick(emoji)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-[19px] hover:bg-white/10"
      >
        {emoji}
      </button>
    ))}
  </div>
);

export default EmojiPalette;
