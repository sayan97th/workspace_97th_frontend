"use client";
import React, { useEffect, useMemo, useState } from "react";
import FilterMenu from "@/components/ui/filter-menu/FilterMenu";
import { SearchIcon } from "@/icons/workspace-icons";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { countActiveCommentFilters, type CommentFilters, type CommentSortOrder } from "./commentFilters";
import "./board-drawer.css";

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
    <div className="update-filter">
      <div className="update-filter__row">
        <div className="update-filter__search">
          <SearchIcon size={15} />
          <input
            type="text"
            value={search_text}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search updates..."
            aria-label="Search updates"
            className="update-filter__input"
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
      <div className="update-filter__chips">
        {CHIPS.filter((chip) => chip.key !== "only_unresolved" || resolved_count > 0 || filters.only_unresolved).map((chip) => (
          <button
            key={chip.key}
            type="button"
            aria-pressed={filters[chip.key]}
            onClick={() => onChange({ [chip.key]: !filters[chip.key] })}
            className="update-filter__chip"
          >
            {chip.label}
            {chip.key === "only_unresolved" && resolved_count > 0 ? ` (${resolved_count})` : ""}
          </button>
        ))}
        {active_count > 0 && (
          <>
            <span role="status" className="update-filter__summary">
              {visible_count} of {total_count} {total_count === 1 ? "update" : "updates"}
            </span>
            <button type="button" onClick={onClear} className="board-drawer__link-button">
              Clear
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onSortChange(sort_order === "newest" ? "oldest" : "newest")}
          aria-label={sort_order === "newest" ? "Sorted newest first, switch to oldest first" : "Sorted oldest first, switch to newest first"}
          title={sort_order === "newest" ? "Newest first" : "Oldest first"}
          className="update-filter__chip update-filter__sort"
        >
          {sort_order === "newest" ? <ArrowDownWideNarrow size={14} /> : <ArrowUpNarrowWide size={14} />}
          {sort_order === "newest" ? "Newest first" : "Oldest first"}
        </button>
      </div>
    </div>
  );
};

export default CommentFilterBar;
