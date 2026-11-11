"use client";
import React, { useMemo } from "react";
import PersonAvatar from "../PersonAvatar";
import type { BoardPersonOption } from "../toolbar/types";
import ReactionsPeopleCard from "./ReactionsPeopleCard";
import { ALL_TAB, buildReactionPeople, formatReactionPeopleNames, type ReactionSource } from "./reactionPeople";
import { usePeopleHoverList } from "./usePeopleHoverList";
import "./reactions-people-card.scss";

const STACK_LIMIT = 3;

type ReactionsSummaryProps = {
  source: ReactionSource;
  current_user: BoardPersonOption;
};

/**
 * "[avatars] You, Haley and 2 others" under a comment or reply, everyone who
 * liked or reacted in one glance. Hovering or clicking it opens the
 * Reactions card on its All tab.
 */
const ReactionsSummary: React.FC<ReactionsSummaryProps> = ({ source, current_user }) => {
  const rows = useMemo(() => buildReactionPeople(source, current_user), [source, current_user]);
  const { anchor, guardClick, toggleNow, trigger_props, card_handlers } = usePeopleHoverList<HTMLButtonElement>(rows.length > 0);

  if (rows.length === 0) return null;

  // The current user first, then the most recent, the same order as the sentence.
  const ordered = [...rows.filter((row) => row.is_you), ...rows.filter((row) => !row.is_you)];
  const stack = ordered.slice(0, STACK_LIMIT);
  const extra_count = ordered.length - stack.length;
  const names = formatReactionPeopleNames(rows);

  return (
    <>
      <button
        {...trigger_props}
        type="button"
        onClick={guardClick(toggleNow)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        aria-label={`${names} liked or reacted. Show everyone.`}
        className="reactions-summary"
      >
        <span className="reactions-summary__stack" aria-hidden="true">
          {stack.map((row) => (
            <PersonAvatar key={row.person.id} person={row.person} size={22} />
          ))}
          {extra_count > 0 && <span className="reactions-summary__more">+{extra_count}</span>}
        </span>
        <span className="reactions-summary__text">{names}</span>
      </button>
      {anchor && <ReactionsPeopleCard source={source} current_user={current_user} initial_tab={ALL_TAB} anchor={anchor} {...card_handlers} />}
    </>
  );
};

export default ReactionsSummary;
