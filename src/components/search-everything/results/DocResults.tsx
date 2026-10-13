"use client";

import type { DocResult } from "@/types/search-everything";
import { BoardGlyph, Highlight, TimeAgo, WorkspaceCrumb, boardHref, type NavigateTo } from "../shared";

type DocResultsProps = {
  docs: DocResult[];
  term: string;
  onNavigate: NavigateTo;
};

/** "Docs": title with its workspace, a few lines of the text around the match, and when it was last edited and by whom. */
export default function DocResults({ docs, term, onNavigate }: DocResultsProps) {
  return (
    <div className="search-everything__doc-list">
      {docs.map((doc) => (
        <button key={doc.id} type="button" className="search-everything__doc" onClick={() => onNavigate(boardHref(doc))}>
          <div className="min-w-0 flex-1">
            <div className="search-everything__doc-title">
              <BoardGlyph board={doc} size={18} />
              <span className="truncate">
                <Highlight text={doc.label} term={term} />
              </span>
              <WorkspaceCrumb workspace={doc.workspace} />
            </div>
            {doc.excerpt && (
              <div className="search-everything__doc-excerpt">
                <Highlight text={doc.excerpt} term={term} />
              </div>
            )}
            <div className="search-everything__meta">
              <TimeAgo iso={doc.updated_at} />
              {doc.updated_by && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Edited by {doc.updated_by.full_name}</span>
                </>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
