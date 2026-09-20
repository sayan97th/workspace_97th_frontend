"use client";
import React, { useEffect, useMemo, useState } from "react";
import FilterMenu from "@/components/ui/filter-menu/FilterMenu";
import { SearchIcon } from "@/icons/workspace-icons";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { countActiveCommentFilters, type CommentFilters, type CommentSortOrder } from "./commentFilters";

export type CommentFilterBarProps = {
  filters: CommentFilters;
  onChange: (patch: Partial<CommentFilters>) => void;
  onClear: () => void;
  /** People who wrote something in the thread, offered by the author menu. */
  authors: { id: string; name: string }[];
  /** Threads that pass the filters, and how many exist, for the "N of M" summary. */
  visible_count: number;
  total_count: number;
  /** How many threads are resolved. The Hide resolved chip only shows once there is at least one. */
  resolved_count?: number;
  sort_order: CommentSortOrder;
  onSortChange: (order: CommentSortOrder) => void;
};

const SEARCH_DEBOUNCE_MS = 200;

const CHIPS: { key: "only_pinned" | "only_bookmarked" | "with_files" | "mentioning_me" | "only_unresolved"; label: string }[] = [
  { key: "only_pinned", label: "Pinned" },
  { key: "only_bookmarked", label: "Bookmarked" },
  { key: "with_files", label: "With files" },
  { key: "mentioning_me", label: "Mentions me" },
  { key: "only_unresolved", label: "Hide resolved" },
];

/**
 * The slim search and filter row above an update thread, shared by the item
 * drawer and the board discussion drawer: search, author, and Pinned,
 * Bookmarked, With files, Mentions me and Hide resolved chips, plus the newest or oldest first
 * order. Filtering happens on the threads already loaded, so it needs no request.
 */
const CommentFilterBar: React.FC<CommentFilterBarProps> = ({ filters, onChange, onClear, authors, visible_count, total_count, resolved_count = 0, sort_order, onSortChange }) => {
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
        {CHIPS.filter((chip) => chip.key !== "only_unresolved" || resolved_count > 0 || filters.only_unresolved).map((chip) => (
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
            {chip.key === "only_unresolved" && resolved_count > 0 ? ` (${resolved_count})` : ""}
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
        <button
          type="button"
          onClick={() => onSortChange(sort_order === "newest" ? "oldest" : "newest")}
          aria-label={sort_order === "newest" ? "Sorted newest first, switch to oldest first" : "Sorted oldest first, switch to newest first"}
          title={sort_order === "newest" ? "Newest first" : "Oldest first"}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-shell-border px-2.5 py-0.5 text-[11.5px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
        >
          {sort_order === "newest" ? <ArrowDownWideNarrow size={12} /> : <ArrowUpNarrowWide size={12} />}
          {sort_order === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>
    </div>
  );
};

export default CommentFilterBar;
