import type { KeyboardEvent } from "react";
import type { PersonDef } from "../types";
import DeactivatedBadge from "../../DeactivatedBadge";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import PopoverPanel from "./PopoverPanel";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import PeopleSelectionFooter from "../../PeopleSelectionFooter";
import { usePeopleSelectionDraft } from "../../usePeopleSelectionDraft";

interface PeopleMenuProps {
  people: PersonDef[];
  /** The cell's stored people, the starting point of the picker's unsaved draft. */
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  /** Commits the drafted selection in one go, an empty list clears the cell. Only called from the "Save" button. */
  onSave: (person_ids: string[]) => void;
  /** Closes the picker and drops any unsaved draft. */
  onClose: () => void;
  /** Whether assigning someone on this column currently notifies them. Undefined hides the toggle entirely (the mock demo, which has no backing notification pipeline). */
  notify_on_assignment?: boolean;
  /** Flips this column's `notify_on_assignment` preference, omitted alongside `notify_on_assignment` for the mock demo. It is a column setting, so it applies right away instead of waiting for "Save". */
  onToggleNotifyOnAssignment?: () => void;
}

export default function PeopleMenu({
  people,
  selected,
  query,
  onQueryChange,
  onSave,
  onClose,
  notify_on_assignment,
  onToggleNotifyOnAssignment,
}: PeopleMenuProps) {
  // The menu mounts fresh on every open, so the draft always starts from the stored value.
  const { draft_ids, has_changes, togglePerson, clearDraft } = usePeopleSelectionDraft(selected);

  // A deactivated person can't be newly assigned, but stays listed (faded) while assigned so they can be removed.
  const filtered = people.filter(
    (p) => (!p.is_deactivated || selected.includes(p.id)) && p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const saveDraft = () => {
    if (has_changes) onSave(draft_ids);
  };

  // Escape cancels, Ctrl/Cmd + Enter saves, so keyboard users never need the mouse to confirm.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      saveDraft();
    }
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[300px] -translate-x-1/2 p-3">
      <div onKeyDown={handleKeyDown}>
        <div className="mb-2.5 flex h-8 items-center gap-[7px] rounded-[6px] border border-boardtree-border px-[9px] focus-within:border-boardtree-accent">
          <svg viewBox="0 0 16 16" width="13" height="13" className="flex-none text-boardtree-text-faint">
            <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search names"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-boardtree-text outline-none"
          />
        </div>
        <div className="px-0.5 pb-[7px] text-[12px] text-boardtree-text-muted">People in this account</div>
        <div className="shell-scrollbar flex max-h-[236px] flex-col gap-0.5 overflow-y-auto">
          {filtered.map((person) => {
            const is_on = draft_ids.includes(person.id);
            return (
              <button
                type="button"
                key={person.id}
                onClick={() => togglePerson(person.id)}
                aria-pressed={is_on}
                className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 hover:bg-boardtree-hover"
              >
                <div
                  className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[9.5px] font-semibold text-white ${getDeactivatedClass(person.is_deactivated)}`}
                  style={{ background: person.color }}
                >
                  {person.initials}
                </div>
                <div className={`flex-1 text-left text-[13px] text-boardtree-text ${getDeactivatedClass(person.is_deactivated)}`}>{person.name}</div>
                <DeactivatedBadge is_deactivated={person.is_deactivated} />
                {is_on && (
                  <div className="flex h-[17px] w-[17px] items-center justify-center rounded-[4px] bg-boardtree-accent">
                    <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  </div>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && <div className="px-2 py-1 text-[12.5px] text-boardtree-text-faint">No people found</div>}
        </div>
        <button
          type="button"
          onClick={clearDraft}
          disabled={draft_ids.length === 0}
          className="pt-2.5 text-[12px] text-boardtree-text-muted hover:text-boardtree-accent disabled:cursor-default disabled:opacity-50 disabled:hover:text-boardtree-text-muted"
        >
          Clear value
        </button>
        <div className="my-2.5 h-px bg-boardtree-border-soft" />
        {notify_on_assignment !== undefined && (
          <>
            <button
              type="button"
              onClick={onToggleNotifyOnAssignment}
              className="flex w-full items-center justify-between gap-2.5 rounded-[6px] px-1 py-1 text-left text-[12.5px] text-boardtree-text hover:bg-boardtree-hover"
            >
              <span>Notify assigned people</span>
              <ToggleSwitch is_on={notify_on_assignment} size="sm" />
            </button>
            <div className="h-2" />
          </>
        )}
        <PeopleSelectionFooter has_changes={has_changes} onCancel={onClose} onSave={saveDraft} />
      </div>
    </PopoverPanel>
  );
}
