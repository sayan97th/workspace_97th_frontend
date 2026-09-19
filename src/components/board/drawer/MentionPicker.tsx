import React from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { isMentionGroup, type MentionGroupOption, type MentionOption } from "./mentionOptions";

export type MentionPickerProps<TOption extends MentionOption> = {
  people: TOption[];
  onPick: (option: TOption) => void;
  /** "below" (default) drops the list under the composer, "above" opens it upward, for a composer near the bottom of a scroll area. */
  placement?: "below" | "above";
};

/** Avatar stand-in for a group row: an "@" badge, since a group has no photo. */
const GroupBadge: React.FC = () => (
  <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-[rgba(87,155,252,0.18)] text-[13px] font-bold text-[#7fb2ff]">
    @
  </span>
);

const groupSubtitle = (group: MentionGroupOption): string =>
  `Notify ${group.member_ids.length} ${group.member_ids.length === 1 ? "person" : "people"}`;

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
    <div className={`absolute left-0 ${placement === "above" ? "bottom-full mb-1" : "top-[52px]"} z-[5] max-h-[220px] w-[280px] overflow-auto rounded-xl border border-shell-border-strong bg-shell-panel p-[5px] shadow-[0_18px_44px_rgba(0,0,0,0.5)]`}>
      {people.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPick(option)}
          className="flex w-full items-center gap-2.5 rounded-lg px-[9px] py-2 text-left hover:bg-shell-hover"
        >
          {isMentionGroup(option) ? <GroupBadge /> : <PersonAvatar person={option} size={26} />}
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-shell-text">{option.name}</span>
            {isMentionGroup(option) && <span className="block text-[11.5px] text-shell-text-faint">{groupSubtitle(option)}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export default MentionPicker;
