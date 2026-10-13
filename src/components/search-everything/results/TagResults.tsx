"use client";

import { useMemo } from "react";
import type { TagResult } from "@/types/search-everything";

type TagResultsProps = {
  tags: TagResult[];
  onPickTag: (tag: TagResult) => void;
  /** Hides the "# Public tags" heading, for the short preview on the "All" tab. */
  is_compact?: boolean;
};

/** "A" for "#apps", "#" for tags that don't start with a letter. */
const groupLetter = (label: string): string => {
  const first = label.replace(/^#+/, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
};

/**
 * "Tags": the account's public tags grouped by first letter in bordered
 * boxes, each tag in its color with how many items use it. Clicking one
 * searches "#tag" on Cross Boards, which lists the tagged items.
 */
export default function TagResults({ tags, onPickTag, is_compact = false }: TagResultsProps) {
  const groups = useMemo(() => {
    const by_letter = new Map<string, TagResult[]>();
    [...tags]
      .sort((a, b) => a.label.replace(/^#+/, "").localeCompare(b.label.replace(/^#+/, ""), undefined, { sensitivity: "base" }))
      .forEach((tag) => {
        const letter = groupLetter(tag.label);
        by_letter.set(letter, [...(by_letter.get(letter) ?? []), tag]);
      });
    return [...by_letter.entries()].sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
  }, [tags]);

  return (
    <div>
      {!is_compact && (
        <h3 className="search-everything__tags-heading">
          <span className="search-everything__tags-heading-mark" aria-hidden="true">
            #
          </span>
          Public tags
        </h3>
      )}
      <div className="search-everything__tag-groups">
        {groups.map(([letter, letter_tags]) => (
          <section key={letter} className="search-everything__tag-group" aria-label={`Tags starting with ${letter}`}>
            <div className="search-everything__tag-letter">{letter}</div>
            <div className="search-everything__tag-grid">
              {letter_tags.map((tag) => (
                <button key={tag.id} type="button" className="search-everything__tag" onClick={() => onPickTag(tag)} title={`Search ${tag.label}`}>
                  <span className="search-everything__tag-label" style={{ color: tag.color || "#9699a6" }}>
                    {tag.label.startsWith("#") ? tag.label : `#${tag.label}`}
                  </span>
                  <span className="search-everything__tag-count">({tag.usage_count})</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
