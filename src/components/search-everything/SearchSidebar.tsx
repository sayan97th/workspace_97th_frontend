"use client";

import type { FileKind, SearchEverythingResponse, SearchEverythingSort, UpdatesFilter } from "@/types/search-everything";

export const UPDATES_FILTER_LABELS: Record<UpdatesFilter, string> = {
  mentioned: "I was mentioned",
  wrote: "I wrote",
  attachments: "Has attachments",
  links: "Has links",
  reply: "Is a reply",
  archived: "Archived",
};

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  image: "Image",
  word: "Word",
  powerpoint: "PowerPoint",
  excel: "Excel",
  pdf: "PDF",
  zip: "Zip",
  music: "Music",
  video: "Video",
  other: "Other",
};

type FacetCheckboxesProps<TKey extends string> = {
  labels: Record<TKey, string>;
  selected: TKey[];
  counts: SearchEverythingResponse<unknown>["facets"];
  onToggle: (key: TKey) => void;
};

/** "I wrote / 214": a checkbox per facet, the count is left out while it is zero, like monday. */
export function FacetCheckboxes<TKey extends string>({ labels, selected, counts, onToggle }: FacetCheckboxesProps<TKey>) {
  return (
    <div className="search-everything__facets" role="group" aria-label="Filters">
      {(Object.keys(labels) as TKey[]).map((key) => {
        const count = counts[key as keyof typeof counts] ?? 0;
        return (
          <label key={key} className="search-everything__check">
            <input type="checkbox" checked={selected.includes(key)} onChange={() => onToggle(key)} />
            <span>{labels[key]}</span>
            {count > 0 && <span className="search-everything__check-count">/ {count}</span>}
          </label>
        );
      })}
    </div>
  );
}

type SortSwitchProps = {
  sort: SearchEverythingSort;
  onChange: (sort: SearchEverythingSort) => void;
};

/** "Sort by: Relevance (switch) Time". */
export function SortSwitch({ sort, onChange }: SortSwitchProps) {
  const is_time = sort === "time";
  return (
    <div className="search-everything__sort">
      <span className="search-everything__sort-label">Sort by:</span>
      <span className="search-everything__sort-option" data-muted={is_time || undefined}>
        Relevance
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={is_time}
        aria-label="Sort by time"
        className="search-everything__switch"
        onClick={() => onChange(is_time ? "relevance" : "time")}
      />
      <span className="search-everything__sort-option" data-muted={!is_time || undefined}>
        Time
      </span>
    </div>
  );
}

/** `10154 results for "seo"`. */
export function ResultSummary({ total, term }: { total: number; term: string }) {
  return (
    <p className="search-everything__summary" title={`${total} results for "${term}"`}>
      {total} {total === 1 ? "result" : "results"} for &quot;{term || " "}&quot;
    </p>
  );
}
