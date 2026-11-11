"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import type { NotificationFilterOption } from "@/data/notifications-data";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/icons/workspace-icons";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import { getUserInitials } from "@/lib/user";
import { NotificationPersonCircleGlyph } from "./NotificationTypeIcon";

type NotificationPersonFilterProps = {
  /** The people who appear in the user's notifications. */
  options: NotificationFilterOption[];
  selected_id: string | null;
  onSelect: (actor_id: string | null) => void;
};

/**
 * monday's "Filter by person" dropdown in the notification center: a button
 * with a person glyph that opens a popover with a search box and the
 * "Suggested people" list. Picking the selected person again clears the filter.
 */
const NotificationPersonFilter: React.FC<NotificationPersonFilterProps> = ({ options, selected_id, onSelect }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected_person = options.find((option) => option.id === selected_id) ?? null;
  const visible_options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.name.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!is_open) return;
    setQuery("");
    const frame_id = requestAnimationFrame(() => search_ref.current?.focus());
    return () => cancelAnimationFrame(frame_id);
  }, [is_open]);

  const pickPerson = (id: string) => {
    onSelect(id === selected_id ? null : id);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        className={`nc-person-filter ${selected_person ? "is-active" : ""}`}
      >
        <NotificationPersonCircleGlyph size={18} />
        <span className="nc-person-filter__label">{selected_person ? selected_person.name : "Filter by person"}</span>
        <ChevronDownIcon size={12} />
      </button>

      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={232}>
        <div className="nc-person-menu">
          <label className="nc-person-menu__search">
            <span className="sr-only">Search people</span>
            <input
              ref={search_ref}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && visible_options[0]) pickPerson(visible_options[0].id);
              }}
            />
            <SearchIcon size={14} />
          </label>

          <div className="nc-person-menu__label">Suggested people</div>
          <div role="listbox" aria-label="Suggested people" className="nc-person-menu__list">
            {visible_options.length === 0 ? (
              <p className="nc-person-menu__empty">{options.length === 0 ? "No people yet" : "No people match"}</p>
            ) : (
              visible_options.map((option) => {
                const is_selected = option.id === selected_id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={is_selected}
                    onClick={() => pickPerson(option.id)}
                    className={`nc-person-menu__option ${is_selected ? "is-selected" : ""}`}
                  >
                    <PersonAvatar
                      person={{
                        id: option.id,
                        name: option.name,
                        initials: getUserInitials({ full_name: option.name }),
                        avatar_seed: Number(option.id) || 0,
                        avatar_url: option.avatar_url,
                        is_deactivated: option.is_deactivated,
                      }}
                      size={24}
                    />
                    <span className={`nc-person-menu__name ${getDeactivatedClass(option.is_deactivated)}`}>{option.name}</span>
                    {is_selected && <CheckIcon size={12} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </BoardPopover>
    </>
  );
};

export default NotificationPersonFilter;
