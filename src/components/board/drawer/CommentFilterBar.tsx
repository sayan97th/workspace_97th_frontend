"use client";
import React, { useEffect, useMemo, useState } from "react";
import FilterMenu from "@/components/ui/filter-menu/FilterMenu";
import { SearchIcon } from "@/icons/workspace-icons";
import { countActiveCommentFilters, type CommentFilters } from "./commentFilters";

export type CommentFilterBarProps = {
  filters: CommentFilters;
  onChange: (patch: Partial<CommentFilters>) => void;
  onClear: () => void;
  /** People who wrote something in the thread, offered by the author menu. */
  authors: { id: string; name: string }[];
  /** Threads that pass the filters, and how many exist, for the "N of M" summary. */
  visible_count: number;
  total_count: number;
};

const SEARCH_DEBOUNCE_MS = 200;

const CHIPS: { key: "only_pinned" | "only_bookmarked" | "with_files" | "mentioning_me"; label: string }[] = [
  { key: "only_pinned", label: "Pinned" },
  { key: "only_bookmarked", label: "Bookmarked" },
  { key: "with_files", label: "With files" },
  { key: "mentioning_me", label: "Mentions me" },
];

/**
 * The slim search and filter row above an update thread, shared by the item
 * drawer and the board discussion drawer: search, author, and Pinned,
 * Bookmarked, With files and Mentions me chips. Filtering happens on the threads already
 * loaded, so it needs no request.
 */
const CommentFilterBar: React.FC<CommentFilterBarProps> = ({ filters, onChange, onClear, authors, visible_count, total_count }) => {
  const [search_text, setSearchText] = useState(filters.search);
  const active_count = countActiveCommentFilters(filters);
  const author_options = useMemo(() => authors, [authors]);

  // A cleared filter changes the search from outside.
  useEffect(() => {
    setSearchText(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (search_text === filters.search) return;
    const timeout_id = setTimeout(() => onChange({ search: search_text }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout_id);
  }, [search_text, filters.search, onChange]);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-shell-border bg-shell-panel-alt px-2.5 py-[6px] text-shell-text-muted focus-within:border-[#00c875]">
          <SearchIcon size={13} />
          <input
            type="text"
            value={search_text}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search updates..."
            aria-label="Search updates"
            className="w-full bg-transparent text-[12.5px] text-shell-text placeholder:text-shell-text-muted focus:outline-none"
          />
        </div>
        <FilterMenu
          label="Person"
          all_label="Everyone"
          options={author_options}
          selected_id={filters.author_id}
          onSelect={(author_id) => onChange({ author_id })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={filters[chip.key]}
            onClick={() => onChange({ [chip.key]: !filters[chip.key] })}
            className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
              filters[chip.key]
                ? "border-[#00c875] bg-[rgba(0,200,117,0.14)] text-[#00c875]"
                : "border-shell-border text-shell-text-muted hover:text-shell-text"
            }`}
          >
            {chip.label}
          </button>
        ))}
        {active_count > 0 && (
          <>
            <span role="status" className="ml-1 text-[11.5px] text-shell-text-faint">
              {visible_count} of {total_count} {total_count === 1 ? "update" : "updates"}
            </span>
            <button type="button" onClick={onClear} className="text-[11.5px] font-semibold text-[#7fb2ff] hover:text-[#9cc4ff]">
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CommentFilterBar;
