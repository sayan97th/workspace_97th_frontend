"use client";
import React from "react";
import type { BoardPersonOption } from "../toolbar/types";
import ReactionsPeopleCard from "./ReactionsPeopleCard";
import { formatReactorNames } from "./reactionFormatting";
import type { ReactionSource } from "./reactionPeople";
import { usePeopleHoverList } from "./usePeopleHoverList";
import type { DrawerReaction } from "./types";

export type ReactionPillProps = {
  reaction: DrawerReaction;
  /** The whole comment or reply, so the card can also offer the All and Like tabs. */
  source: ReactionSource;
  current_user: BoardPersonOption;
  /** Adds or removes the current user's own reaction with this emoji. */
  onToggle: () => void;
};

/**
 * One reaction pill of a comment or reply. Clicking it toggles the current
 * user's own reaction, hovering or focusing it (or holding it on a touch
 * screen) opens the Reactions card on this emoji's tab, so nobody has to
 * guess who "3" stands for.
 */
const ReactionPill: React.FC<ReactionPillProps> = ({ reaction, source, current_user, onToggle }) => {
  const { anchor, guardClick, trigger_props, card_handlers } = usePeopleHoverList<HTMLButtonElement>();

  return (
    <>
      <button
        {...trigger_props}
        type="button"
        onClick={guardClick(onToggle)}
        aria-label={`${reaction.emoji} ${reaction.count}, ${formatReactorNames(reaction.reactor_names)} reacted. ${reaction.reacted_by_me ? "Click to remove your reaction." : "Click to add your reaction."}`}
        className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors"
        style={{
          background: reaction.reacted_by_me ? "rgba(87,155,252,0.18)" : "var(--color-shell-hover)",
          borderColor: reaction.reacted_by_me ? "#579bfc" : "var(--color-shell-border-strong)",
        }}
      >
        <span className="text-sm">{reaction.emoji}</span>
        {reaction.count}
      </button>
      {anchor && <ReactionsPeopleCard source={source} current_user={current_user} initial_tab={reaction.emoji} anchor={anchor} {...card_handlers} />}
    </>
  );
};

export default ReactionPill;
