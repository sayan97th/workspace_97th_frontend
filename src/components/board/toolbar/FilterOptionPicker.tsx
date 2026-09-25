"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/icons/board-icons";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import PersonAvatar from "../PersonAvatar";
import type { BoardPersonOption, BoardQuickFilterFacetOption } from "./types";

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
    return <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: option.dot_color }} />;
  }
  return null;
}

/**
 * Multi-select value picker for Option, People and Group filter rules: a
 * trigger showing the picked values as chips, and a searchable checklist that
 * stays open while several values are toggled (unlike {@link InlineFieldMenu},
 * which closes on the first pick).
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

  return (
    <div ref={container_ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-[38px] w-full items-center justify-between gap-2 rounded-lg border bg-boardtree-hover px-2.5 text-[13.5px] transition-colors ${
          is_open ? "border-boardtree-accent" : "border-boardtree-border hover:border-boardtree-text-faint"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {selected_options.length === 0 && <span className="truncate text-boardtree-text-faint">{placeholder}</span>}
          {selected_options.slice(0, MAX_TRIGGER_CHIPS).map((option) => (
            <span
              key={option.id}
              className="flex h-6 min-w-0 max-w-[140px] flex-none items-center gap-1.5 rounded-md bg-boardtree-hover-strong px-1.5 text-[12.5px] font-medium text-boardtree-text"
            >
              <OptionGlyph option={option} persons={persons} />
              <span className="truncate">{option.label}</span>
            </span>
          ))}
          {selected_options.length > MAX_TRIGGER_CHIPS && (
            <span className="flex-none text-[12.5px] font-semibold text-boardtree-text-muted">
              +{selected_options.length - MAX_TRIGGER_CHIPS}
            </span>
          )}
        </span>
        <ChevronDownIcon
          size={11}
          className={`flex-none text-boardtree-text-muted transition-transform ${is_open ? "rotate-180" : ""}`}
        />
      </button>

      {is_open && (
        <div className="absolute left-0 top-[calc(100%+5px)] z-[210] w-full min-w-[240px] rounded-[9px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-2xl shadow-black/50">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="mb-1 h-8 w-full rounded-md border border-boardtree-border bg-boardtree-hover px-2.5 text-[13px] text-boardtree-text placeholder:text-boardtree-text-faint focus:border-boardtree-accent focus:outline-none"
          />
          <div className="shell-scrollbar max-h-[240px] overflow-y-auto">
            {visible_options.length === 0 && (
              <div className="px-2 py-2 text-[13px] text-boardtree-text-muted">No values match</div>
            )}
            {visible_options.map((option) => {
              const is_selected = selected_ids.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] text-boardtree-text hover:bg-boardtree-hover ${
                    is_selected ? "bg-boardtree-accent/[0.12]" : ""
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
                      is_selected ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"
                    }`}
                  >
                    {is_selected && <CheckIcon size={10} className="text-white" />}
                  </span>
                  <OptionGlyph option={option} persons={persons} />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
          {selected_ids.length > 0 && (
            <div className="mt-1 flex justify-end border-t border-boardtree-border-soft px-1 pt-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[12.5px] font-medium text-boardtree-text-muted hover:text-boardtree-text"
              >
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
