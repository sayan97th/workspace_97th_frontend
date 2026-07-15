"use client";
import React, { useRef, useState } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { InfoIcon, PersonIcon, SearchIcon } from "@/icons/workspace-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import SelectablePersonAvatar from "./SelectablePersonAvatar";
import ToolbarButton from "./ToolbarButton";

export type PersonControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const POPOVER_WIDTH = 430;

function PersonControl<TRow>({ toolbar }: PersonControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [is_search_focused, setSearchFocused] = useState(false);
  const is_open = toolbar.active_panel === "person";
  const trimmed_query = query.trim();
  const selected_count = toolbar.selected_person_ids.length;

  const filtered_persons = toolbar.persons.filter((person) =>
    person.name.toLowerCase().includes(trimmed_query.toLowerCase())
  );

  const handleClose = () => {
    toolbar.closePanel();
    setQuery("");
  };

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Person"
        Icon={PersonIcon}
        is_open={is_open}
        has_selection={selected_count > 0}
        badge_count={selected_count || undefined}
        onClick={() => toolbar.togglePanel("person")}
      />
      <BoardPopover
        anchor_el={button_ref.current}
        is_open={is_open}
        onClose={handleClose}
        width={POPOVER_WIDTH}
        align="start"
      >
        <div className="flex items-center gap-2 px-[18px] pb-3 pt-4">
          <span className="text-[15px] font-bold text-shell-text">Filter this board by person</span>
          <span className="flex flex-none items-center text-shell-text-faint" title="People with access to this board">
            <InfoIcon size={15} />
          </span>
          <div className="flex-1" />
          <span className="flex h-[30px] flex-none cursor-default items-center rounded-lg border border-shell-border-strong px-3 text-[12.5px] font-semibold text-shell-text-muted">
            Save as new view
          </span>
        </div>

        <div className="px-[18px] pb-3.5">
          <div
            className="flex h-[38px] items-center gap-[9px] rounded-[9px] border bg-shell-hover-strong px-3 transition-colors"
            style={{ borderColor: is_search_focused ? "var(--color-brand-500)" : "var(--color-shell-border-strong)" }}
          >
            <span className="flex flex-none items-center text-shell-text-faint">
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-shell-text placeholder:text-shell-text-faint focus:outline-none"
            />
            {trimmed_query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex flex-none items-center text-shell-text-faint hover:text-shell-text"
              >
                <CloseIcon size={13} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="shell-scrollbar max-h-[288px] overflow-y-auto px-4 pb-1.5">
          {filtered_persons.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filtered_persons.map((person) => (
                <SelectablePersonAvatar
                  key={person.id}
                  person={person}
                  is_selected={toolbar.selected_person_ids.includes(person.id)}
                  onToggle={() => toolbar.togglePersonId(person.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
              <span className="flex-none text-shell-text-faint">
                <PersonIcon size={24} />
              </span>
              <span className="text-[13px] text-shell-text-muted">No people match &ldquo;{trimmed_query}&rdquo;</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-b-xl border-t border-shell-border bg-shell-hover px-[18px] py-[11px]">
          <span className="text-[12.5px] text-shell-text-muted">
            {selected_count === 0 ? `${toolbar.persons.length} people` : `${selected_count} selected`}
          </span>
          {selected_count > 0 ? (
            <button
              type="button"
              onClick={toolbar.clearPersonFilter}
              className="text-[13px] font-semibold text-shell-text-secondary hover:text-shell-text"
            >
              Clear
            </button>
          ) : null}
        </div>
      </BoardPopover>
    </>
  );
}

export default PersonControl;
