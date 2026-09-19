"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import FilterMenu from "@/components/ui/filter-menu/FilterMenu";
import { ChevronDownIcon, SearchIcon } from "@/icons/workspace-icons";
import {
  countActiveFeedFilters,
  feed_date_presets,
  resolveFeedDatePreset,
  type FeedAuthorOption,
  type FeedFilters,
  type FeedKindFilter,
} from "@/data/update-feed-data";

export type FeedFilterBarProps = {
  filters: FeedFilters;
  onChange: (patch: Partial<FeedFilters>) => void;
  onClear: () => void;
  authors: FeedAuthorOption[];
  onLoadAuthors: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

const KIND_OPTIONS: { id: FeedKindFilter | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "updates", label: "Updates" },
  { id: "replies", label: "Replies" },
];

const DATE_INPUT_CLASS =
  "w-full rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none";

/** "Sep 14" style label for a `YYYY-MM-DD` day, read as a local date. */
const formatDay = (day: string): string => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const dateRangeLabel = (filters: FeedFilters): string => {
  if (filters.from && filters.to) return filters.from === filters.to ? formatDay(filters.from) : `${formatDay(filters.from)} to ${formatDay(filters.to)}`;
  if (filters.from) return `Since ${formatDay(filters.from)}`;
  if (filters.to) return `Until ${formatDay(filters.to)}`;
  return "Any date";
};

/**
 * The feed's filter row: search, person, update or reply, a date range and an
 * "unread only" switch. It only edits the filters, the server applies them
 * (see `useFeedUpdates`). Typing in the search box waits for a pause before
 * filtering.
 */
const FeedFilterBar: React.FC<FeedFilterBarProps> = ({ filters, onChange, onClear, authors, onLoadAuthors }) => {
  const [search_text, setSearchText] = useState(filters.search);
  const [is_date_open, setIsDateOpen] = useState(false);
  const date_trigger_ref = useRef<HTMLButtonElement>(null);
  const active_count = countActiveFeedFilters(filters);
  const has_dates = filters.from !== null || filters.to !== null;

  // A cleared filter, or an applied saved view, changes the search from outside.
  useEffect(() => {
    setSearchText(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (search_text === filters.search) return;
    const timeout_id = setTimeout(() => onChange({ search: search_text }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout_id);
  }, [search_text, filters.search, onChange]);

  const applyPreset = (preset: (typeof feed_date_presets)[number]["id"]) => {
    onChange(resolveFeedDatePreset(preset));
    setIsDateOpen(false);
  };

  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-2">
      <div className="flex min-w-[180px] flex-1 items-center gap-[9px] rounded-[9px] border border-shell-border bg-shell-panel-alt px-3 py-[7px] text-shell-text-muted focus-within:border-brand-500">
        <SearchIcon size={13} />
        <input
          type="text"
          value={search_text}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search updates and people..."
          aria-label="Search updates"
          className="w-full bg-transparent text-[12.5px] text-shell-text placeholder:text-shell-text-muted focus:outline-none"
        />
      </div>

      <FilterMenu
        label="Person"
        all_label="Everyone"
        options={authors}
        selected_id={filters.author_id}
        onSelect={(author_id) => onChange({ author_id })}
        onOpen={onLoadAuthors}
      />

      <div role="group" aria-label="Filter by kind" className="flex overflow-hidden rounded-[8px] border border-shell-border">
        {KIND_OPTIONS.map((option) => {
          const is_active = (filters.kind ?? "all") === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={is_active}
              onClick={() => onChange({ kind: option.id === "all" ? null : option.id })}
              className={`px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                is_active ? "bg-shell-hover-strong text-shell-text" : "text-shell-text-muted hover:text-shell-text"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        ref={date_trigger_ref}
        type="button"
        onClick={() => setIsDateOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={is_date_open}
        className={`flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
          has_dates ? "border-brand-500 text-shell-text" : "border-shell-border text-shell-text-muted hover:text-shell-text"
        }`}
      >
        {dateRangeLabel(filters)}
        <ChevronDownIcon size={10} className="flex-none" />
      </button>
      <BoardPopover anchor_el={date_trigger_ref.current} is_open={is_date_open} onClose={() => setIsDateOpen(false)} width={250} align="start">
        <div className="p-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {feed_date_presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="rounded-full border border-shell-border px-2.5 py-1 text-[11.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="mb-2 block text-[11.5px] font-semibold text-shell-text-muted">
            From
            <input
              type="date"
              value={filters.from ?? ""}
              max={filters.to ?? undefined}
              onChange={(event) => onChange({ from: event.target.value || null })}
              className={`${DATE_INPUT_CLASS} mt-1`}
            />
          </label>
          <label className="block text-[11.5px] font-semibold text-shell-text-muted">
            To
            <input
              type="date"
              value={filters.to ?? ""}
              min={filters.from ?? undefined}
              onChange={(event) => onChange({ to: event.target.value || null })}
              className={`${DATE_INPUT_CLASS} mt-1`}
            />
          </label>
          {has_dates && (
            <button
              type="button"
              onClick={() => onChange({ from: null, to: null })}
              className="mt-2.5 text-[12px] font-semibold text-[#7fb2ff] transition-colors hover:text-[#9cc4ff]"
            >
              Clear dates
            </button>
          )}
        </div>
      </BoardPopover>

      <button
        type="button"
        role="switch"
        aria-checked={filters.unread_only}
        onClick={() => onChange({ unread_only: !filters.unread_only })}
        className="flex flex-none items-center gap-2 text-[12.5px] font-medium text-shell-text-secondary"
      >
        <span className={`relative h-[19px] w-[34px] flex-none rounded-full transition-colors ${filters.unread_only ? "bg-brand-500" : "bg-shell-hover-strong"}`}>
          <span
            className={`absolute top-[2px] h-[15px] w-[15px] rounded-full transition-all ${
              filters.unread_only ? "left-[17px] bg-white" : "left-[2px] bg-shell-text-muted"
            }`}
          />
        </span>
        Unread only
      </button>

      {active_count > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex-none text-[12px] font-semibold text-[#7fb2ff] transition-colors hover:text-[#9cc4ff]"
        >
          Clear filters ({active_count})
        </button>
      )}
    </div>
  );
};

export default FeedFilterBar;
