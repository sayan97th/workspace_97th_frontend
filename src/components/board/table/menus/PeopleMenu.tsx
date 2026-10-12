"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { PersonDef } from "../types";
import { getDeactivatedClass, getPersonTitle } from "@/lib/deactivated-user";
import PopoverPanel from "./PopoverPanel";
import AvatarBadge from "./AvatarBadge";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import PeopleSelectionFooter from "../../PeopleSelectionFooter";
import { usePeopleSelectionDraft } from "../../usePeopleSelectionDraft";
import "./people-picker.css";

/** Assigned people shown as chips before the rest fold into a "+ N" chip, like monday.com. */
const COLLAPSED_CHIP_COUNT = 1;

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

/** "Name (Job title)", or just the name when no job title is set. */
function getPersonLabel(person: PersonDef): string {
  const job_title = person.job_title?.trim();
  return job_title ? `${person.name} (${job_title})` : person.name;
}

function matchesQuery(person: PersonDef, normalized_query: string): boolean {
  if (!normalized_query) return true;
  return (
    person.name.toLowerCase().includes(normalized_query) || (person.job_title ?? "").toLowerCase().includes(normalized_query)
  );
}

function CloseIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" className="flex-none">
      <path
        d="M10 2.75a5 5 0 0 0-5 5v2.9l-1.3 2.35a.75.75 0 0 0 .66 1.1h11.28a.75.75 0 0 0 .66-1.1L15 10.65v-2.9a5 5 0 0 0-5-5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 16.25a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The table's People cell picker, monday style. Assigned people sit as chips inside the search
 * field and leave the list, everyone else is listed as "Name (Job title)". Picking only edits a
 * local draft (see `usePeopleSelectionDraft`) that "Save" commits in one write. The card draws
 * its own chrome (`people-picker.css`), so the panel is `unstyled`.
 */
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
  const [is_chips_expanded, setIsChipsExpanded] = useState(false);
  // -1 until the person types or uses the arrows, so no row looks pre picked on open.
  const [active_index, setActiveIndex] = useState(-1);
  const input_ref = useRef<HTMLInputElement>(null);
  const list_ref = useRef<HTMLDivElement>(null);

  const people_by_id = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  // Chips follow the order people were picked in, ids missing from the roster are skipped.
  const draft_people = useMemo(
    () => draft_ids.map((id) => people_by_id.get(id)).filter((person): person is PersonDef => Boolean(person)),
    [draft_ids, people_by_id]
  );

  // Assigned people live in the chips, and a deactivated person can never be newly assigned.
  const normalized_query = query.trim().toLowerCase();
  const options = useMemo(
    () => people.filter((person) => !person.is_deactivated && !draft_ids.includes(person.id) && matchesQuery(person, normalized_query)),
    [people, draft_ids, normalized_query]
  );
  const highlighted_index = Math.min(active_index, options.length - 1);

  // Keeps the keyboard highlighted row in view while moving with the arrows.
  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [highlighted_index]);

  const visible_chips = is_chips_expanded ? draft_people : draft_people.slice(0, COLLAPSED_CHIP_COUNT);
  const hidden_chip_count = draft_people.length - visible_chips.length;

  const saveDraft = () => {
    if (has_changes) onSave(draft_ids);
  };

  const pickPerson = (person_id: string) => {
    togglePerson(person_id);
    onQueryChange("");
    setActiveIndex(-1);
    input_ref.current?.focus();
  };

  const removePerson = (person_id: string) => {
    togglePerson(person_id);
    input_ref.current?.focus();
  };

  // Clicking the field's empty space (not a chip or a button) focuses the search input.
  const focusInputFromField = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    input_ref.current?.focus();
  };

  const expandChips = () => {
    setIsChipsExpanded(true);
    input_ref.current?.focus();
  };

  const clearAll = () => {
    clearDraft();
    onQueryChange("");
    setIsChipsExpanded(false);
    input_ref.current?.focus();
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

  // Arrows move through the list, Enter assigns the highlighted person, Backspace on an empty field drops the last chip.
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const start_index = highlighted_index < 0 ? (step === 1 ? -1 : 0) : highlighted_index;
      setActiveIndex((start_index + step + options.length) % options.length);
    } else if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const person = options[highlighted_index];
      if (person) pickPerson(person.id);
    } else if (event.key === "Backspace" && query === "" && draft_ids.length > 0) {
      event.preventDefault();
      togglePerson(draft_ids[draft_ids.length - 1]);
    }
  };

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div onKeyDown={handleKeyDown} className="people-picker" role="dialog" aria-label="Assign people">
        <div className="people-picker__body">
          <div className="people-picker__field" onMouseDown={focusInputFromField}>
            {visible_chips.map((person) => (
              <span
                key={person.id}
                className={`people-picker__chip ${getDeactivatedClass(person.is_deactivated)}`}
                title={getPersonTitle(person.name, person.is_deactivated)}
              >
                <AvatarBadge
                  size={20}
                  overlap={false}
                  has_ring={false}
                  initials={person.initials}
                  color={person.color}
                  avatar_url={person.avatar_url}
                />
                <span className="people-picker__chip-name">{person.name}</span>
                <button
                  type="button"
                  className="people-picker__chip-remove"
                  onClick={() => removePerson(person.id)}
                  aria-label={`Remove ${person.name}`}
                >
                  <CloseIcon size={14} />
                </button>
              </span>
            ))}
            {hidden_chip_count > 0 && (
              <button
                type="button"
                className="people-picker__chip people-picker__chip--more"
                onClick={expandChips}
                title={draft_people.slice(COLLAPSED_CHIP_COUNT).map((person) => person.name).join(", ")}
                aria-label={`Show ${hidden_chip_count} more assigned people`}
              >
                + {hidden_chip_count}
              </button>
            )}
            <input
              ref={input_ref}
              autoFocus
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setActiveIndex(event.target.value.trim() ? 0 : -1);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={draft_people.length ? "" : "Search names or roles"}
              className="people-picker__input"
              aria-label="Search people"
              aria-controls="people-picker-options"
            />
            {(draft_ids.length > 0 || query) && (
              <button type="button" className="people-picker__clear" onClick={clearAll} aria-label="Clear value" title="Clear value">
                <CloseIcon size={16} />
              </button>
            )}
          </div>

          <div className="people-picker__section-title">People in this account</div>
          <div ref={list_ref} id="people-picker-options" className="people-picker__list shell-scrollbar" role="listbox" aria-label="People">
            {options.map((person, index) => {
              const is_active = index === highlighted_index;
              return (
                <button
                  type="button"
                  key={person.id}
                  role="option"
                  aria-selected={false}
                  data-active={is_active || undefined}
                  onClick={() => pickPerson(person.id)}
                  onMouseMove={() => !is_active && setActiveIndex(index)}
                  className={`people-picker__option ${is_active ? "people-picker__option--active" : ""}`}
                >
                  <AvatarBadge
                    size={28}
                    overlap={false}
                    has_ring={false}
                    initials={person.initials}
                    color={person.color}
                    avatar_url={person.avatar_url}
                  />
                  <span className="people-picker__option-label" title={getPersonLabel(person)}>
                    {getPersonLabel(person)}
                  </span>
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="people-picker__empty">{normalized_query ? "No people found" : "Everyone is already assigned"}</div>
            )}
          </div>
        </div>

        {notify_on_assignment !== undefined && (
          <button
            type="button"
            role="switch"
            aria-checked={notify_on_assignment}
            onClick={onToggleNotifyOnAssignment}
            className="people-picker__notify"
          >
            <BellIcon />
            <span className="people-picker__notify-text">Notify assigned people</span>
            <ToggleSwitch is_on={notify_on_assignment} size="sm" />
          </button>
        )}
        <div className="people-picker__divider" />
        <PeopleSelectionFooter variant="monday" has_changes={has_changes} onCancel={onClose} onSave={saveDraft} />
      </div>
    </PopoverPanel>
  );
}
