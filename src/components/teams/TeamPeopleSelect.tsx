"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { PersonAvatar } from "@/components/board";
import { formatPersonOption } from "./teamMapping";
import type { TeamMember } from "./types";

export type TeamPeopleSelectProps = {
  people: TeamMember[];
  selected_ids: string[];
  onChange: (selected_ids: string[]) => void;
  placeholder?: string;
  is_loading?: boolean;
  /** Opens the list as soon as the dialog shows, like monday's "Add users". */
  auto_focus?: boolean;
  /** Accessible name of the field. */
  aria_label: string;
};

/**
 * monday style multi person picker used by the Teams dialogs: the chosen people are light blue
 * chips inside the field, the field has a clear "x" and a chevron, and the floating list shows
 * "Name (Title)" rows with photos. Typing filters by name, email or title, the arrow keys and
 * Enter pick, Backspace on an empty field drops the last chip, Escape closes the list.
 */
const TeamPeopleSelect: React.FC<TeamPeopleSelectProps> = ({
  people,
  selected_ids,
  onChange,
  placeholder = "Enter name",
  is_loading = false,
  auto_focus = false,
  aria_label,
}) => {
  const [query, setQuery] = useState("");
  const [is_open, setIsOpen] = useState(auto_focus);
  const [active_index, setActiveIndex] = useState(0);
  const container_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  const list_id = useId();

  useEffect(() => {
    if (auto_focus) input_ref.current?.focus();
  }, [auto_focus]);

  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [is_open]);

  const selected_people = useMemo(
    () => selected_ids.map((id) => people.find((person) => person.id === id)).filter((person): person is TeamMember => Boolean(person)),
    [people, selected_ids]
  );

  const options = useMemo(() => {
    const trimmed_query = query.trim().toLowerCase();
    return people.filter(
      (person) =>
        !selected_ids.includes(person.id) &&
        (!trimmed_query ||
          person.name.toLowerCase().includes(trimmed_query) ||
          person.email.toLowerCase().includes(trimmed_query) ||
          (person.title ?? "").toLowerCase().includes(trimmed_query))
    );
  }, [people, selected_ids, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, is_open]);

  const pick = (person: TeamMember) => {
    onChange([...selected_ids, person.id]);
    setQuery("");
    input_ref.current?.focus();
  };

  const unpick = (person_id: string) => onChange(selected_ids.filter((id) => id !== person_id));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (is_open && options[active_index]) pick(options[active_index]);
    } else if (event.key === "Backspace" && query === "" && selected_ids.length > 0) {
      onChange(selected_ids.slice(0, -1));
    } else if (event.key === "Escape" && is_open) {
      // Close only the list, the dialog stays open.
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setIsOpen(false);
    }
  };

  return (
    <div ref={container_ref} className="teams-picker">
      <div
        className="teams-picker-field"
        data-open={is_open}
        onMouseDown={(event) => {
          if (event.target === input_ref.current) return;
          event.preventDefault();
          input_ref.current?.focus();
          setIsOpen(true);
        }}
      >
        {selected_people.map((person) => (
          <span key={person.id} className="teams-picker-chip">
            <PersonAvatar person={person} size={22} />
            <span>{person.name}</span>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => unpick(person.id)}
              aria-label={`Remove ${person.name}`}
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={input_ref}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected_people.length === 0 ? placeholder : ""}
          aria-label={aria_label}
          role="combobox"
          aria-expanded={is_open}
          aria-controls={list_id}
          aria-autocomplete="list"
        />
        <span className="teams-picker-controls">
          {selected_ids.length > 0 ? (
            <button
              type="button"
              className="teams-icon-button teams-icon-button-sm"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => onChange([])}
              aria-label="Clear selection"
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="teams-icon-button teams-icon-button-sm"
            onMouseDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setIsOpen((open) => !open);
              input_ref.current?.focus();
            }}
            aria-label={is_open ? "Close list" : "Open list"}
          >
            {is_open ? <ChevronUp size={16} strokeWidth={1.75} /> : <ChevronDown size={16} strokeWidth={1.75} />}
          </button>
        </span>
      </div>

      {is_open ? (
        <div id={list_id} role="listbox" aria-label={aria_label} className="teams-picker-list shell-scrollbar">
          {is_loading ? (
            <div className="teams-picker-empty">Loading people...</div>
          ) : options.length === 0 ? (
            <div className="teams-picker-empty">{query ? "No people match your search." : "Everyone is already selected."}</div>
          ) : (
            options.map((person, index) => (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={index === active_index}
                data-active={index === active_index}
                className="teams-picker-option"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(person)}
              >
                <PersonAvatar person={person} size={24} />
                <span className="teams-picker-option-text">{formatPersonOption(person)}</span>
                {person.is_guest ? <span className="teams-pill">Guest</span> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default TeamPeopleSelect;
