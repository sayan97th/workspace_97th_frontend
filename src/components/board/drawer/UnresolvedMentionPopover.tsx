"use client";
import React from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import FloatingSuggestion from "@/components/board/doc/editor/menus/FloatingSuggestion";
import { LockIcon } from "@/components/board/privacy/PrivateBoardNotice";
import type { BoardPersonOption } from "../toolbar/types";
import type { UnresolvedMention } from "./pastedMentions";
import "./unresolved-mention-popover.scss";

type UnresolvedMentionPopoverProps = {
  mention: UnresolvedMention;
  /** The board roster, so someone invited after the paste can be tagged right away. */
  board_people: BoardPersonOption[];
  /** Screen rectangle of the flagged name, the popover opens right under it. */
  getAnchorRect: () => DOMRect | null;
  /** Rewrites the flagged name to `person` and tags them. */
  onResolve: (person: BoardPersonOption) => void;
  /** Drops the `@`, so the name is sent as plain text. */
  onSendAsText: () => void;
  /** Leaves the text as it is and stops flagging it. */
  onIgnore: () => void;
  /** Opens the board's invite dialog, for someone in the workspace who is not on this private board. */
  onInviteClick?: () => void;
};

const POPOVER_WIDTH = 280;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/**
 * The small card under a pasted `@name` that did not become a mention, opened
 * when the caret is in it (a click on the dashed underline), like a spell
 * checker: one line saying why, the people it may mean as picker rows, and
 * "Send as plain text" or "Ignore". Someone in the workspace who was not
 * added to this private board gets "Invite to board" instead, the way Slack
 * offers to invite someone mentioned outside the channel.
 */
const UnresolvedMentionPopover: React.FC<UnresolvedMentionPopoverProps> = ({
  mention,
  board_people,
  getAnchorRect,
  onResolve,
  onSendAsText,
  onIgnore,
  onInviteClick,
}) => {
  const { issue } = mention;
  let message: React.ReactNode;
  let people: BoardPersonOption[] = [];
  let extra_action: React.ReactNode = null;

  if (issue.kind === "outside") {
    const now_on_board = board_people.find((person) => person.id === issue.person.id);
    if (now_on_board) {
      message = <>{issue.person.name} was added to this board.</>;
      people = [now_on_board];
    } else {
      message = (
        <>
          <LockIcon size={11} /> Not on this private board, so they won&apos;t be notified.
        </>
      );
      if (onInviteClick) {
        extra_action = (
          <button type="button" onClick={onInviteClick} className="unresolved-mention__primary">
            Invite to board
          </button>
        );
      }
    }
  } else if (issue.kind === "ambiguous") {
    message = <>Which {firstName(issue.suggestions[0]?.name ?? mention.text.slice(1))}?</>;
    people = issue.suggestions;
  } else {
    message = issue.suggestions.length > 0 ? <>Not found on this board. Did you mean:</> : <>Not found on this board, nobody will be notified.</>;
    people = issue.suggestions;
  }

  return (
    <FloatingSuggestion getRect={getAnchorRect} width={POPOVER_WIDTH} max_height={320} class_name="unresolved-mention">
      <p className="unresolved-mention__message" data-kind={issue.kind}>
        {message}
      </p>

      {people.length > 0 && (
        <ul className="unresolved-mention__people">
          {people.map((person) => (
            <li key={person.id}>
              <button type="button" onClick={() => onResolve(person)} className="unresolved-mention__person">
                <PersonAvatar person={person} size={22} />
                <span className="unresolved-mention__name">{person.name}</span>
                {person.job_title && <span className="unresolved-mention__role">{person.job_title}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="unresolved-mention__footer">
        {extra_action}
        <button type="button" onClick={onSendAsText} className="unresolved-mention__link" title="Removes the @ so it reads as plain text">
          Send as plain text
        </button>
        <button type="button" onClick={onIgnore} className="unresolved-mention__link">
          Ignore
        </button>
      </div>
    </FloatingSuggestion>
  );
};

export default UnresolvedMentionPopover;
