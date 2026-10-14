"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "@/icons/board-icons";
import { ChevronDownIcon, SearchIcon } from "@/icons/workspace-icons";
import PersonAvatar from "../PersonAvatar";
import type { BoardPersonOption, BoardQuickFilterFacetOption } from "./types";
import "./field-menu.css";

export type FilterOptionPickerProps = {
  options: BoardQuickFilterFacetOption[];
  selected_ids: string[];
  onChange: (ids: string[]) => void;
  persons: BoardPersonOption[];
  placeholder?: string;
};

const MAX_TRIGGER_CHIPS = 2;

function OptionGlyph({ option, persons }: { option: BoardQuickFilterFacetOption; persons: BoardPersonOption[] }) {
  const person = option.person_id ? persons.find((p) => p.id === option.person_id) : undefined;
  if (person) return <PersonAvatar person={person} size={18} />;
  if (option.dot_color) {
    return <span className="field-menu__dot" style={{ background: option.dot_color }} />;
  }
  return null;
}

/**
 * Multi-select value picker for Option, People and Group filter rules: a
 * trigger showing the picked values as light blue chips (each with its own
 * remove "x", like monday), and a searchable checklist that stays open while
 * several values are toggled (unlike {@link InlineFieldMenu}, which closes on
 * the first pick).
 */
function FilterOptionPicker({ options, selected_ids, onChange, persons, placeholder = "Value" }: FilterOptionPickerProps) {
  const [is_open, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [is_open]);

  useEffect(() => {
    if (!is_open) setQuery("");
  }, [is_open]);

  const trimmed_query = query.trim().toLowerCase();
  const visible_options = trimmed_query
    ? options.filter((option) => option.label.toLowerCase().includes(trimmed_query))
    : options;
  const selected_options = selected_ids
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is BoardQuickFilterFacetOption => Boolean(option));

  const toggle = (id: string) =>
    onChange(selected_ids.includes(id) ? selected_ids.filter((existing) => existing !== id) : [...selected_ids, id]);

  const toggleOpen = () => setIsOpen((current) => !current);

  return (
    <div ref={container_ref} className="field-menu flex-1">
      {/* A div, not a button, so each chip can hold its own remove button. */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleOpen();
          }
        }}
        className="field-menu__trigger"
      >
        <span className="field-menu__value">
          {selected_options.length === 0 && <span className="field-menu__placeholder">{placeholder}</span>}
          {selected_options.slice(0, MAX_TRIGGER_CHIPS).map((option) => (
            <span key={option.id} className="field-menu__chip">
              <OptionGlyph option={option} persons={persons} />
              <span className="field-menu__label">{option.label}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(option.id);
                }}
                aria-label={`Remove ${option.label}`}
                className="field-menu__chip-remove"
              >
                <CloseIcon size={9} />
              </button>
            </span>
          ))}
          {selected_options.length > MAX_TRIGGER_CHIPS && (
            <span className="field-menu__more">+{selected_options.length - MAX_TRIGGER_CHIPS}</span>
          )}
        </span>
        <span className="field-menu__chevron">
          <ChevronDownIcon size={11} />
        </span>
      </div>

      {is_open && (
        <div className="field-menu__popup" role="listbox" aria-multiselectable style={{ minWidth: 240 }}>
          <div className="field-menu__search">
            <span className="field-menu__search-icon">
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="field-menu__search-input"
            />
          </div>
          <div className="field-menu__list" style={{ maxHeight: 240, overflowY: "auto" }}>
            {visible_options.length === 0 && <div className="field-menu__empty">No values match</div>}
            {visible_options.map((option) => {
              const is_selected = selected_ids.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={is_selected}
                  onClick={() => toggle(option.id)}
                  className="field-menu__option"
                >
                  <span className="field-menu__checkbox" data-checked={is_selected}>
                    {is_selected && <CheckIcon size={10} />}
                  </span>
                  <OptionGlyph option={option} persons={persons} />
                  <span className="field-menu__label flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
          {selected_ids.length > 0 && (
            <div className="field-menu__footer">
              <button type="button" onClick={() => onChange([])} className="field-menu__link-button">
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterOptionPicker;
