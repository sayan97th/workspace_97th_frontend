"use client";
import React, { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { PersonAvatar, type BoardPersonOption } from "@/components/board";

export type PeopleMultiSelectProps = {
  /** Full candidate pool. Already-selected people are excluded from the open dropdown. */
  people: BoardPersonOption[];
  selected_ids: string[];
  onChange: (selected_ids: string[]) => void;
  /** Secondary line shown under a candidate's name in the dropdown, e.g. an email address. */
  getSubtitle?: (person: BoardPersonOption) => string | undefined;
  placeholder?: string;
  className?: string;
  /** Show the full candidate list right away instead of waiting for the field to be focused. */
  default_open?: boolean;
};

/**
 * Chip-based multi-person picker: a text field that turns into a search-as-you-type
 * candidate list, with selections rendered as removable chips inline. Generic over
 * {@link BoardPersonOption} so any feature needing a "pick people" input (team
 * membership, assignees, mention lists, ...) can reuse it instead of building its own.
 *
 * The candidate list renders in normal document flow directly under the field (like the
 * board toolbar's `PersonControl` option list) rather than floating absolutely over
 * whatever follows — a host that puts this right above footer buttons (e.g. a compact
 * dialog) would otherwise have that footer silently covered, and sometimes unclickable,
 * while the list is open.
 */
const PeopleMultiSelect: React.FC<PeopleMultiSelectProps> = ({
  people,
  selected_ids,
  onChange,
  getSubtitle,
  placeholder = "Search people by name",
  className = "",
  default_open = false,
}) => {
  const [query, setQuery] = useState("");
  const [is_open, setIsOpen] = useState(default_open);
  const container_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!is_open) return;
    // Close on "click", not "mousedown": the list renders in-flow, so collapsing it
    // shifts whatever sits below it (e.g. a dialog's Cancel/Create buttons). Closing on
    // mousedown collapsed it *before* that same click's mouseup/click phase landed,
    // so the button had already moved out from under the pointer — the click missed
    // entirely. Closing on "click" lets the target's own click handler run first
    // (React's delegated listener fires before this document-level one), then closes
    // the list, so there's nothing left to react to the reflow.
    const handleOutsideClick = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [is_open]);

  const selected_people = selected_ids
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is BoardPersonOption => Boolean(person));

  const trimmed_query = query.trim().toLowerCase();
  const candidates = people
    .filter((person) => !selected_ids.includes(person.id))
    .filter((person) => !trimmed_query || person.name.toLowerCase().includes(trimmed_query));

  const selectPerson = (id: string) => {
    onChange([...selected_ids, id]);
    setQuery("");
    // Close instead of leaving the list open: it renders in-flow, so leaving it mounted
    // shifts whatever follows it (e.g. a dialog's footer) up as soon as it collapses —
    // if that collapse is triggered by the *same* click that's aiming at that footer
    // (the click-outside handler fires on mousedown, before mouseup/click land), the
    // reflow can shift the target out from under the click entirely. Don't re-focus the
    // input here: clicking the candidate row can blur it, and a fresh focus() call would
    // just re-fire onFocus and reopen the list this same tick, undoing the close.
    setIsOpen(false);
  };

  const removePerson = (id: string) => {
    onChange(selected_ids.filter((selected_id) => selected_id !== id));
  };

  return (
    <div ref={container_ref} className={className}>
      <div
        onClick={() => {
          setIsOpen(true);
          input_ref.current?.focus();
        }}
        className="flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-[9px] border border-white/[0.14] bg-[#0F1C1C] px-[9px] py-[6px] focus-within:border-brand-500"
      >
        {selected_people.map((person) => (
          <span
            key={person.id}
            className="flex items-center gap-1.5 rounded-2xl bg-brand-500/[0.16] py-1 pl-1 pr-2"
          >
            <PersonAvatar person={person} size={20} />
            <span className="text-[12.5px] font-medium text-[#ffd9d5]">{person.name}</span>
            <button
              type="button"
              onClick={() => removePerson(person.id)}
              aria-label={`Remove ${person.name}`}
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[#ffb3ac] hover:bg-white/[0.14]"
            >
              <CloseIcon size={9} />
            </button>
          </span>
        ))}
        <input
          ref={input_ref}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selected_people.length ? "" : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-0.5 py-1 text-[13px] text-[#e9eded] placeholder:text-[#7e8889] focus:outline-none"
        />
      </div>

      {is_open ? (
        <div className="shell-scrollbar mt-1.5 max-h-[220px] overflow-y-auto rounded-[11px] border border-white/[0.14] bg-[#0F1C1C] p-1.5">
          {candidates.length > 0 ? (
            candidates.map((person) => (
              <div
                key={person.id}
                onClick={() => selectPerson(person.id)}
                className="flex cursor-pointer items-center gap-[10px] rounded-lg px-[9px] py-2 hover:bg-white/[0.06]"
              >
                <PersonAvatar person={person} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[#e9eded]">
                    {person.name}
                  </span>
                  {getSubtitle?.(person) ? (
                    <span className="block truncate text-[11.5px] text-[#7e8889]">
                      {getSubtitle(person)}
                    </span>
                  ) : null}
                </span>
              </div>
            ))
          ) : (
            <div className="px-[10px] py-4 text-center text-[12.5px] text-[#7e8889]">
              No matching people.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PeopleMultiSelect;
