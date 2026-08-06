"use client";
import React, { useState } from "react";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
import BoardPopover from "../toolbar/BoardPopover";
import PersonAvatar from "../PersonAvatar";
import PersonAvatarStack, { type PersonAvatarStackPerson } from "../PersonAvatarStack";

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export type KanbanCardMembersProps = {
  /** Everyone assignable (board owners) — the picker's full list. */
  people: PersonAvatarStackPerson[];
  /** The subset currently assigned to this card. */
  selected: PersonAvatarStackPerson[];
  onToggle: (person_id: string) => void;
};

/**
 * Trello-style member avatar stack for a Kanban card's "Members" column (the
 * board's first `people` column — see `TableBoardView`'s `renderKanbanCard`).
 * Displays via the shared `PersonAvatarStack` and opens a small assign/unassign
 * popover on click, mirroring the People cell's picker without pulling in the
 * generic `BoardValueCell` chip treatment.
 */
const KanbanCardMembers: React.FC<KanbanCardMembersProps> = ({ people, selected, onToggle }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);
  const selected_ids = new Set(selected.map((person) => String(person.id)));

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
      }}
      className="cursor-pointer"
    >
      {selected.length > 0 ? (
        <PersonAvatarStack people={selected} size={22} empty_label="" />
      ) : (
        <button
          type="button"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-shell-border text-shell-text-faint opacity-0 transition-opacity hover:border-shell-border-strong hover:text-shell-text group-hover:opacity-100"
          title="Add member"
        >
          <PlusIcon size={10} />
        </button>
      )}
      <BoardPopover anchor_el={anchor_el} is_open={anchor_el !== null} onClose={() => setAnchorEl(null)} align="end" width={240}>
        <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto p-2">
          {people.length === 0 && (
            <p className="px-1 py-3 text-center text-[12.5px] text-shell-text-faint">No members to assign.</p>
          )}
          {people.map((person, index) => {
            const is_selected = selected_ids.has(String(person.id));
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onToggle(String(person.id))}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-shell-hover"
              >
                <PersonAvatar
                  person={{
                    id: String(person.id),
                    name: person.full_name,
                    initials: getInitials(person.full_name),
                    avatar_seed: index,
                    avatar_url: person.profile_photo_url ?? undefined,
                  }}
                  size={24}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-shell-text">{person.full_name}</span>
                {is_selected && (
                  <span className="flex-none text-brand-500">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </BoardPopover>
    </div>
  );
};

export default KanbanCardMembers;
