import React from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";

export type MentionPickerProps = {
  people: BoardPersonOption[];
  onPick: (person: BoardPersonOption) => void;
};

/** `@mention` autocomplete dropdown shared by the update composer and every reply box. */
const MentionPicker: React.FC<MentionPickerProps> = ({ people, onPick }) => (
  <div className="absolute left-0 top-[52px] z-[5] max-h-[220px] w-[280px] overflow-auto rounded-xl border border-white/[0.12] bg-[#0f1c1c] p-[5px] shadow-[0_18px_44px_rgba(0,0,0,0.5)]">
    {people.map((person) => (
      <button
        key={person.id}
        type="button"
        onClick={() => onPick(person)}
        className="flex w-full items-center gap-2.5 rounded-lg px-[9px] py-2 text-left hover:bg-white/[0.07]"
      >
        <PersonAvatar person={person} size={26} />
        <span className="text-[13px] font-medium text-[#e9eded]">{person.name}</span>
      </button>
    ))}
  </div>
);

export default MentionPicker;
