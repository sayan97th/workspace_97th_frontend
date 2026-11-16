"use client";
import React from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import { LockIcon } from "@/components/board/privacy/PrivateBoardNotice";
import type { BoardPersonOption } from "../toolbar/types";
import type { UnresolvedMention } from "./pastedMentions";
import "./pasted-mentions-notice.scss";

export type PastedMentionsNoticeProps = {
  /** Everyone pasted text tagged in this draft, in the order they were found. */
  people: BoardPersonOption[];
  /** Pasted `@names` that did not become mentions: nobody, several people, or someone not on this private board. */
  unresolved: UnresolvedMention[];
  /** The board roster, so someone invited after the paste can be tagged right away. */
  board_people: BoardPersonOption[];
  /** Turns one tag back into plain text, so that person is not notified. */
  onUntag: (person: BoardPersonOption) => void;
  /** Rewrites a flagged name to `person` and tags them, a "Did you mean" pick. */
  onResolve: (mention: UnresolvedMention, person: BoardPersonOption) => void;
  /** Drops the `@` of a flagged name, so it is sent as plain text. */
  onSendAsText: (mention: UnresolvedMention) => void;
  /** Selects the flagged name in the text. */
  onReveal: (mention: UnresolvedMention) => void;
  /** Opens the board's invite dialog, for someone in the workspace who is not on this private board. */
  onInviteClick?: () => void;
  /** Hides the notice. Tags and flags stay. */
  onDismiss: () => void;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** A clickable person suggestion: photo and full name. */
const SuggestionButton: React.FC<{ person: BoardPersonOption; onClick: () => void }> = ({ person, onClick }) => (
  <button type="button" onClick={onClick} className="pasted-mentions__suggestion" title={`Tag ${person.name}`}>
    <PersonAvatar person={person} size={18} />
    <span>{person.name}</span>
  </button>
);

/** One flagged name: what is wrong in plain words and the ways to fix it. */
const UnresolvedRow: React.FC<{
  mention: UnresolvedMention;
  board_people: BoardPersonOption[];
  onResolve: PastedMentionsNoticeProps["onResolve"];
  onSendAsText: PastedMentionsNoticeProps["onSendAsText"];
  onReveal: PastedMentionsNoticeProps["onReveal"];
  onInviteClick?: () => void;
}> = ({ mention, board_people, onResolve, onSendAsText, onReveal, onInviteClick }) => {
  const { issue } = mention;
  let message: React.ReactNode;
  let actions: React.ReactNode = null;

  if (issue.kind === "outside") {
    // Invited after the paste: they are on the board now, so the tag works.
    const now_on_board = board_people.find((person) => person.id === issue.person.id);
    if (now_on_board) {
      message = <>{issue.person.name} was added to this board.</>;
      actions = <SuggestionButton person={now_on_board} onClick={() => onResolve(mention, now_on_board)} />;
    } else {
      message = (
        <>
          <LockIcon size={11} /> {issue.person.name} is not on this private board, so they won&apos;t be notified.
        </>
      );
      actions = onInviteClick ? (
        <button type="button" onClick={onInviteClick} className="pasted-mentions__primary">
          Invite to board
        </button>
      ) : null;
    }
  } else if (issue.kind === "ambiguous") {
    message = <>Which {firstName(issue.suggestions[0]?.name ?? mention.text.slice(1))} did you mean?</>;
    actions = issue.suggestions.map((person) => (
      <SuggestionButton key={person.id} person={person} onClick={() => onResolve(mention, person)} />
    ));
  } else if (issue.suggestions.length > 0) {
    message = <>No one on this board has this name. Did you mean:</>;
    actions = issue.suggestions.map((person) => (
      <SuggestionButton key={person.id} person={person} onClick={() => onResolve(mention, person)} />
    ));
  } else {
    message = <>No one on this board has this name, so nobody will be notified.</>;
  }

  return (
    <li className="pasted-mentions__issue" data-kind={issue.kind}>
      <button
        type="button"
        onClick={() => onReveal(mention)}
        className="pasted-mentions__token"
        title="Show in the text"
      >
        {mention.text}
      </button>
      <div className="pasted-mentions__issue-body">
        <span className="pasted-mentions__issue-text">{message}</span>
        <div className="pasted-mentions__issue-actions">
          {actions}
          <button type="button" onClick={() => onSendAsText(mention)} className="pasted-mentions__link" title="Removes the @ so it reads as plain text">
            Send as plain text
          </button>
        </div>
      </div>
    </li>
  );
};

/**
 * Shown above a composer after a paste, the way Slack points out mentions
 * only to the person writing: who the pasted `@names` tagged (one chip each,
 * with a button that removes the tag), and the names that need a look. A
 * misspelled name offers "Did you mean", a first name several people share
 * asks which one, and someone in the workspace who was not added to this
 * private board offers "Invite to board", since they would not be notified.
 * "Got it" hides the card.
 */
const PastedMentionsNotice: React.FC<PastedMentionsNoticeProps> = ({
  people,
  unresolved,
  board_people,
  onUntag,
  onResolve,
  onSendAsText,
  onReveal,
  onInviteClick,
  onDismiss,
}) => {
  if (people.length === 0 && unresolved.length === 0) return null;

  const tagged_label = people.length === 1 ? "1 person" : `${people.length} people`;
  const flagged_label = unresolved.length === 1 ? "1 name needs a look" : `${unresolved.length} names need a look`;
  const title = people.length > 0 ? `Tagged ${tagged_label} from your paste` : `${flagged_label} in your paste`;

  return (
    <div className="pasted-mentions" role="status" aria-live="polite" data-has-issues={unresolved.length > 0 ? "true" : undefined}>
      <span className="pasted-mentions__badge" aria-hidden="true">
        @
      </span>

      <div className="pasted-mentions__body">
        <p className="pasted-mentions__title">
          {title}
          {people.length > 0 && <span className="pasted-mentions__hint">They will be notified when you send this.</span>}
        </p>

        {people.length > 0 && (
          <ul className="pasted-mentions__chips">
            {people.map((person, index) => (
              <li key={person.id} className="pasted-mentions__chip" style={{ animationDelay: `${index * 45}ms` }}>
                <PersonAvatar person={person} size={20} />
                <span className="pasted-mentions__name">{person.name}</span>
                <button
                  type="button"
                  onClick={() => onUntag(person)}
                  aria-label={`Remove the tag for ${person.name}`}
                  title="Remove tag"
                  className="pasted-mentions__remove"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {unresolved.length > 0 && (
          <div className="pasted-mentions__issues-block">
            {people.length > 0 && (
              <p className="pasted-mentions__subtitle">
                <WarningIcon />
                {flagged_label}
              </p>
            )}
            <ul className="pasted-mentions__issues">
              {unresolved.map((mention) => (
                <UnresolvedRow
                  key={mention.id}
                  mention={mention}
                  board_people={board_people}
                  onResolve={onResolve}
                  onSendAsText={onSendAsText}
                  onReveal={onReveal}
                  onInviteClick={onInviteClick}
                />
              ))}
            </ul>
          </div>
        )}

        <p className="pasted-mentions__private">
          <EyeIcon />
          Only visible to you
        </p>
      </div>

      <button type="button" onClick={onDismiss} className="pasted-mentions__dismiss">
        Got it
      </button>
    </div>
  );
};

const WarningIcon: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.75 15 14H1L8 1.75Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M8 6.25v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="8" cy="11.75" r="0.85" fill="currentColor" />
  </svg>
);

const EyeIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export default PastedMentionsNotice;
