"use client";
import React, { useRef, useState } from "react";
import AvatarBadge from "../table/menus/AvatarBadge";
import PeopleMenu from "../table/menus/PeopleMenu";
import type { PersonDef } from "../table/types";

export type KanbanPeopleFieldProps = {
  /** Everyone the picker can assign, the same roster the board table's People cells use. */
  people: PersonDef[];
  selected_ids: string[];
  /** Commits the picker's confirmed selection, an empty list clears the field. */
  onSave: (person_ids: string[]) => void;
  /** Whether assigning someone on this column notifies them. Omit to hide the toggle. */
  notify_on_assignment?: boolean;
  onToggleNotifyOnAssignment?: () => void;
};

const MAX_AVATARS = 3;
const AVATAR_SIZE = 28;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.27);
/** A press on the field while the picker is open closes it on pointerdown, the click that follows must not reopen it. */
const REOPEN_GUARD_MS = 300;

/**
 * The item card's People field. Shows the assigned people as the board
 * table's avatar stack and opens the table's own monday style picker
 * (`PeopleMenu`: chips in the search field, "Name (Job title)" rows, the
 * "Notify assigned people" switch and Cancel/Save), so assigning people
 * looks and works the same in the table and in the Kanban card.
 */
function KanbanPeopleField({ people, selected_ids, onSave, notify_on_assignment, onToggleNotifyOnAssignment }: KanbanPeopleFieldProps) {
  const [is_open, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const last_closed_at_ref = useRef(0);
  const people_by_id = new Map(people.map((person) => [person.id, person]));
  const names = selected_ids.map((id) => people_by_id.get(id)?.name ?? id);

  const close = () => {
    last_closed_at_ref.current = Date.now();
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="relative flex h-full w-full min-w-0">
      <button
        type="button"
        onClick={() => {
          if (Date.now() - last_closed_at_ref.current > REOPEN_GUARD_MS) setIsOpen(true);
        }}
        className="flex h-full w-full items-center justify-center"
        aria-label={names.length ? `Assigned to ${names.join(", ")}. Change people` : "Assign people"}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        title={names.join(", ") || undefined}
      >
        {/* The left padding offsets the first avatar's overlap margin, so the stack stays centered. */}
        <span className="flex items-center" style={{ paddingLeft: AVATAR_OVERLAP }}>
          {selected_ids.slice(0, MAX_AVATARS).map((id) => {
            const person = people_by_id.get(id);
            return (
              <AvatarBadge
                key={id}
                size={AVATAR_SIZE}
                initials={person?.initials || "?"}
                color={person?.color || "#9aa0b6"}
                name={person?.name}
                avatar_url={person?.avatar_url}
                is_deactivated={person?.is_deactivated}
              />
            );
          })}
          {selected_ids.length > MAX_AVATARS && (
            <span
              className="flex flex-none items-center justify-center rounded-full border-2 border-boardtree-surface bg-boardtree-hover-strong text-[11px] font-medium leading-none text-boardtree-text"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, marginLeft: -AVATAR_OVERLAP }}
            >
              +{selected_ids.length - MAX_AVATARS}
            </span>
          )}
          {selected_ids.length === 0 && (
            // Empty person placeholder, an outlined avatar like monday.com's.
            <span className="flex items-center justify-center text-boardtree-control-border" style={{ marginLeft: -AVATAR_OVERLAP }}>
              <svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
                <circle cx="13" cy="13" r="12.25" fill="var(--color-boardtree-surface)" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="13" cy="10.4" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5.6 21.4 a8.2 6.6 0 0 1 14.8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </span>
      </button>

      {is_open && (
        <PeopleMenu
          people={people}
          selected={selected_ids}
          query={query}
          onQueryChange={setQuery}
          onSave={(person_ids) => {
            onSave(person_ids);
            close();
          }}
          onClose={close}
          notify_on_assignment={notify_on_assignment}
          onToggleNotifyOnAssignment={onToggleNotifyOnAssignment}
        />
      )}
    </div>
  );
}

export default KanbanPeopleField;
