"use client";
import React, { useState } from "react";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
import BoardPopover from "../toolbar/BoardPopover";
import PersonAvatar from "../PersonAvatar";
import PersonAvatarStack, { type PersonAvatarStackPerson } from "../PersonAvatarStack";
import DeactivatedBadge from "../DeactivatedBadge";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import PeopleSelectionFooter from "../PeopleSelectionFooter";
import { usePeopleSelectionDraft } from "../usePeopleSelectionDraft";

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export type KanbanCardMembersProps = {
  /** Everyone assignable (board owners), the picker's full list. Deactivated people are only listed while assigned, so they can be removed. */
  people: PersonAvatarStackPerson[];
  /** The subset currently assigned to this card. */
  selected: PersonAvatarStackPerson[];
  /** Commits the confirmed selection (an empty list unassigns everyone). Only called from the picker's "Save" button. */
  onSave: (person_ids: string[]) => void;
  /**
   * When true, always renders just the small "+" trigger, never the avatar
   * stack, regardless of `selected`. Used by the drawer's Assignee row, which
   * already renders its own single avatar for the first assignee — showing
   * the full stack here too would duplicate it.
   */
  hide_stack?: boolean;
};

/**
 * Trello-style member avatar stack for a Kanban card's "Members" column (the
 * board's first `people` column — see `TableBoardView`'s `renderKanbanCard`).
 * Displays via the shared `PersonAvatarStack` and opens a small assign/unassign
 * popover on click, mirroring the People cell's picker without pulling in the
 * generic `BoardValueCell` chip treatment.
 */
const KanbanCardMembers: React.FC<KanbanCardMembersProps> = ({ people, selected, onSave, hide_stack = false }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);
  const saved_ids = selected.map((person) => String(person.id));
  // Ticks only edit this draft, "Save" commits it in one call (see `usePeopleSelectionDraft`).
  const { draft_ids, has_changes, togglePerson, resetDraft } = usePeopleSelectionDraft(saved_ids);

  const closePicker = () => setAnchorEl(null);

  const saveDraft = () => {
    if (has_changes) onSave(draft_ids);
    closePicker();
  };

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        if (anchor_el) return;
        resetDraft(saved_ids);
        setAnchorEl(event.currentTarget);
      }}
      className="cursor-pointer"
    >
      {selected.length > 0 && !hide_stack ? (
        <PersonAvatarStack people={selected} size={22} empty_label="" />
      ) : (
        <button
          type="button"
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border border-dashed border-shell-border-strong text-shell-text-faint transition-opacity hover:border-shell-text-faint hover:text-shell-text-secondary ${
            hide_stack ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          title="Add member"
        >
          <PlusIcon size={10} />
        </button>
      )}
      <BoardPopover anchor_el={anchor_el} is_open={anchor_el !== null} onClose={closePicker} align="end" width={240}>
        <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto p-2">
          {people.length === 0 && (
            <p className="px-1 py-3 text-center text-[12.5px] text-shell-text-faint">No members to assign.</p>
          )}
          {people.map((person, index) => {
            const is_selected = draft_ids.includes(String(person.id));
            // A deactivated person can't be newly assigned, but stays listed while assigned so they can be removed.
            if (person.is_deactivated && !saved_ids.includes(String(person.id))) return null;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => togglePerson(String(person.id))}
                aria-pressed={is_selected}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-shell-hover"
              >
                <PersonAvatar
                  person={{
                    id: String(person.id),
                    name: person.full_name,
                    initials: getInitials(person.full_name),
                    avatar_seed: index,
                    avatar_url: person.profile_photo_url ?? undefined,
                    is_deactivated: person.is_deactivated,
                  }}
                  size={24}
                />
                <span className={`min-w-0 flex-1 truncate text-[13px] text-shell-text ${getDeactivatedClass(person.is_deactivated)}`}>{person.full_name}</span>
                <DeactivatedBadge is_deactivated={person.is_deactivated} />
                {is_selected && (
                  <span className="flex-none text-brand-500">
                    <CheckIcon size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {people.length > 0 && (
          <div className="border-t border-shell-border px-2 py-2">
            <PeopleSelectionFooter has_changes={has_changes} onCancel={closePicker} onSave={saveDraft} />
          </div>
        )}
      </BoardPopover>
    </div>
  );
};

export default KanbanCardMembers;
