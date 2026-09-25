import React from "react";

/** Whether `text` contains the search query (case insensitive). An empty query matches nothing. */
export const containsSearchQuery = (text: string, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  return needle !== "" && text.toLowerCase().includes(needle);
};

/**
 * Wraps every occurrence of the search query in `text` with a highlight, the
 * way a browser's find in page does. `is_active` paints the current Ctrl/Cmd+F
 * jump target stronger than the other matches.
 */
export function highlightSearchMatches(text: string, query: string, is_active = false): React.ReactNode {
  const needle = query.trim().toLowerCase();
  if (!needle) return text;
  const haystack = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark
        key={index}
        className={`rounded-[2px] text-[#1e2237] ${is_active ? "bg-[#fdab3d]" : "bg-[#ffcb00]/60"}`}
      >
        {text.slice(index, index + needle.length)}
      </mark>
    );
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  if (!parts.length) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
