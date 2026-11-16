"use client";
import React from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import type { BoardPersonOption } from "../toolbar/types";
import "./pasted-mentions-notice.scss";

type PastedMentionsNoticeProps = {
  /** Everyone pasted text tagged in this draft, in the order they were found. */
  people: BoardPersonOption[];
  /** Turns one tag back into plain text, so that person is not notified. */
  onUntag: (person: BoardPersonOption) => void;
  /** Hides the notice. The tags stay. */
  onDismiss: () => void;
};

/**
 * Shown above a composer after a paste tagged people, the way Slack turns a
 * pasted `@Name` into a mention: a soft card that says who will be notified,
 * one chip per person with their photo, and a button on each chip that
 * removes the tag (the name stays as plain text). "Got it" hides the card.
 */
const PastedMentionsNotice: React.FC<PastedMentionsNoticeProps> = ({ people, onUntag, onDismiss }) => {
  if (people.length === 0) return null;

  const count_label = people.length === 1 ? "1 person" : `${people.length} people`;

  return (
    <div className="pasted-mentions" role="status" aria-live="polite">
      <span className="pasted-mentions__badge" aria-hidden="true">
        @
      </span>

      <div className="pasted-mentions__body">
        <p className="pasted-mentions__title">
          Tagged {count_label} from your paste
          <span className="pasted-mentions__hint">They will be notified when you send this.</span>
        </p>

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
      </div>

      <button type="button" onClick={onDismiss} className="pasted-mentions__dismiss">
        Got it
      </button>
    </div>
  );
};

export default PastedMentionsNotice;
