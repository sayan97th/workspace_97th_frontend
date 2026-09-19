"use client";
import React, { useMemo, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import PersonAvatar from "../PersonAvatar";
import type { BoardPersonOption } from "../toolbar/types";
import { AssignPersonIcon } from "@/icons/drawer-icons";
import { CheckIcon } from "@/icons/workspace-icons";
import type { ComposerAssignment } from "./types";

export type ComposerAssignMenuProps = {
  /** Everyone who can be assigned, the board's people. */
  people: BoardPersonOption[];
  value: ComposerAssignment;
  onChange: (assignment: ComposerAssignment) => void;
  icon_size?: number;
};

/** Below this many people the list needs no search box. */
const SEARCH_THRESHOLD = 8;

/**
 * The composer's "Assign" button: turns an update into a task. Pick who should
 * take it and, optionally, a due date. When the update is posted the people are
 * added to the item's People column and the date is set on its Date column.
 */
const ComposerAssignMenu: React.FC<ComposerAssignMenuProps> = ({ people, value, onChange, icon_size = 16 }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const is_active = value.user_ids.length > 0 || value.due_date !== null;
  const visible_people = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? people.filter((person) => person.name.toLowerCase().includes(needle)) : people;
  }, [people, search]);

  const togglePerson = (person_id: string) =>
    onChange({
      ...value,
      user_ids: value.user_ids.includes(person_id) ? value.user_ids.filter((id) => id !== person_id) : [...value.user_ids, person_id],
    });

  return (
    <span className="relative">
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Assign from this update"
        aria-haspopup="dialog"
        aria-expanded={is_open}
        title="Assign people and a due date from this update"
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-shell-hover hover:text-shell-text ${
          is_active || is_open ? "bg-shell-hover text-[#7fb2ff]" : "text-shell-text-muted"
        }`}
      >
        <AssignPersonIcon size={icon_size} />
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={288} align="start">
        <div role="dialog" aria-label="Assign from this update" className="p-2">
          <div className="px-2 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">Assign to</div>
          {people.length > SEARCH_THRESHOLD && (
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="mb-1.5 w-full rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text placeholder:text-shell-text-muted focus:border-brand-500 focus:outline-none"
            />
          )}
          <div className="shell-scrollbar max-h-[200px] overflow-y-auto">
            {visible_people.length === 0 && <p className="px-2 py-2 text-[12.5px] text-shell-text-muted">No one matches.</p>}
            {visible_people.map((person) => {
              const is_selected = value.user_ids.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  role="checkbox"
                  aria-checked={is_selected}
                  onClick={() => togglePerson(person.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-shell-hover"
                >
                  <PersonAvatar person={person} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-shell-text">{person.name}</span>
                  <span
                    className={`flex h-[16px] w-[16px] flex-none items-center justify-center rounded border ${
                      is_selected ? "border-brand-500 bg-brand-500 text-white" : "border-shell-border-strong text-transparent"
                    }`}
                  >
                    <CheckIcon size={10} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-shell-border px-2 pb-1 pt-2.5">
            <label htmlFor="composer-assign-due" className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">
              Due date (optional)
            </label>
            <input
              id="composer-assign-due"
              type="date"
              value={value.due_date ?? ""}
              onChange={(event) => onChange({ ...value, due_date: event.target.value || null })}
              className="w-full rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none"
            />
            <div className="mt-2.5 flex items-center justify-between gap-2">
              {is_active ? (
                <button
                  type="button"
                  onClick={() => onChange({ user_ids: [], due_date: null })}
                  className="text-[12px] font-semibold text-shell-text-muted hover:text-shell-text"
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[8px] bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </BoardPopover>
    </span>
  );
};

export default ComposerAssignMenu;
