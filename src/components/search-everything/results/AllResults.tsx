"use client";

import type { ReactNode } from "react";
import type { AllTabResults, SearchEverythingCountedTab, SearchEverythingCounts, TagResult } from "@/types/search-everything";
import { TAB_LABELS, type NavigateTo } from "../shared";
import BoardResults from "./BoardResults";
import DocResults from "./DocResults";
import FileResults from "./FileResults";
import PeopleResults from "./PeopleResults";
import TagResults from "./TagResults";
import UpdateResults from "./UpdateResults";

type AllResultsProps = {
  results: AllTabResults;
  counts: SearchEverythingCounts | null;
  term: string;
  onNavigate: NavigateTo;
  onSeeAll: (tab: SearchEverythingCountedTab) => void;
  onPickTag: (tag: TagResult) => void;
};

/** "All": a short preview of every tab that has results, each with "See all" jumping to its tab. */
export default function AllResults({ results, counts, term, onNavigate, onSeeAll, onPickTag }: AllResultsProps) {
  const sections: Array<{ tab: SearchEverythingCountedTab; length: number; content: ReactNode }> = [
    { tab: "boards", length: results.boards.length, content: <BoardResults boards={results.boards} term={term} onNavigate={onNavigate} /> },
    { tab: "updates", length: results.updates.length, content: <UpdateResults updates={results.updates} term={term} onNavigate={onNavigate} /> },
    { tab: "files", length: results.files.length, content: <FileResults files={results.files} onNavigate={onNavigate} /> },
    { tab: "people", length: results.people.length, content: <PeopleResults people={results.people} term={term} /> },
    { tab: "tags", length: results.tags.length, content: <TagResults tags={results.tags} onPickTag={onPickTag} is_compact /> },
    { tab: "docs", length: results.docs.length, content: <DocResults docs={results.docs} term={term} onNavigate={onNavigate} /> },
  ];

  return (
    <>
      {sections
        .filter((section) => section.length > 0)
        .map((section) => (
          <section key={section.tab} className="search-everything__section" aria-label={TAB_LABELS[section.tab]}>
            <header className="search-everything__section-header">
              <h3 className="search-everything__section-title">{TAB_LABELS[section.tab]}</h3>
              <button type="button" className="search-everything__see-all" onClick={() => onSeeAll(section.tab)}>
                See all{counts ? ` (${counts[section.tab]})` : ""}
              </button>
            </header>
            {section.content}
          </section>
        ))}
    </>
  );
}
