import React from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { isMentionGroup, type MentionGroupOption, type MentionOption } from "./mentionOptions";
import "./rich-text.css";

export type MentionPickerProps<TOption extends MentionOption> = {
  people: TOption[];
  onPick: (option: TOption) => void;
  /** "below" (default) drops the list under the composer, "above" opens it upward, for a composer near the bottom of a scroll area. */
  placement?: "below" | "above";
};

/** Avatar stand-in for a group row: an "@" badge, since a group has no photo. */
const GroupBadge: React.FC = () => (
  <span className="rich-text-menu__badge">@</span>
);

const groupSubtitle = (group: MentionGroupOption): string =>
  `${group.kind === "team" ? "Team, notify" : "Notify"} ${group.member_ids.length} ${group.member_ids.length === 1 ? "person" : "people"}`;

/**
 * `@mention` autocomplete dropdown shared by the update composer and every reply box.
 * Offers a group row (such as "Everyone") alongside individual people when the
 * caller passes one; the "Notify" picker only ever passes people.
 */
function MentionPicker<TOption extends MentionOption = BoardPersonOption>({
  people,
  onPick,
  placement = "below",
}: MentionPickerProps<TOption>) {
  return (
    <div className={`rich-text-menu ${placement === "above" ? "bottom-full mb-1" : "top-[52px]"} max-h-[240px] w-[280px]`}>
      {people.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPick(option)}
          className="rich-text-menu__item"
        >
          {isMentionGroup(option) ? <GroupBadge /> : <PersonAvatar person={option} size={26} />}
          <span className="min-w-0">
            <span className="rich-text-menu__label">{option.name}</span>
            {isMentionGroup(option) && <span className="rich-text-menu__description">{groupSubtitle(option)}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export default MentionPicker;
