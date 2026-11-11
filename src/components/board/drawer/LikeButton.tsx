"use client";
import React from "react";
import { LikeIcon } from "@/icons/drawer-icons";
import type { BoardPersonOption } from "../toolbar/types";
import ReactionsPeopleCard from "./ReactionsPeopleCard";
import { formatReactorNames } from "./reactionFormatting";
import { LIKE_TAB, type ReactionSource } from "./reactionPeople";
import { usePeopleHoverList } from "./usePeopleHoverList";

type LikeButtonProps = {
  entry: ReactionSource;
  current_user: BoardPersonOption;
  onToggle: () => void;
  /** `update-card__action` on a top-level update, `update-card__reply-action` on a reply. */
  class_name: string;
  icon_size?: number;
};

/**
 * The Like action of an update or reply. Clicking toggles the current user's
 * like, hovering or focusing it (or holding it on a touch screen) opens the
 * Reactions card on its Like tab, so everyone who liked it is listed with
 * when they did.
 */
const LikeButton: React.FC<LikeButtonProps> = ({ entry, current_user, onToggle, class_name, icon_size }) => {
  const has_likes = entry.like_count > 0;
  const { anchor, guardClick, trigger_props, card_handlers } = usePeopleHoverList<HTMLButtonElement>(has_likes);

  const liker_names = (entry.likers ?? []).map((person) => (person.id === current_user.id ? "You" : person.name));
  const aria_label = has_likes
    ? `Like, ${entry.like_count}.${liker_names.length > 0 ? ` Liked by ${formatReactorNames(liker_names)}.` : ""} ${entry.liked_by_me ? "Click to remove your like." : "Click to like."}`
    : "Like";

  return (
    <>
      <button
        {...trigger_props}
        type="button"
        onClick={guardClick(onToggle)}
        aria-pressed={entry.liked_by_me}
        aria-label={aria_label}
        data-active={entry.liked_by_me ? "liked" : undefined}
        className={class_name}
      >
        <LikeIcon size={icon_size} filled={entry.liked_by_me} />
        Like{has_likes ? ` · ${entry.like_count}` : ""}
      </button>
      {anchor && has_likes && <ReactionsPeopleCard source={entry} current_user={current_user} initial_tab={LIKE_TAB} anchor={anchor} {...card_handlers} />}
    </>
  );
};

export default LikeButton;
