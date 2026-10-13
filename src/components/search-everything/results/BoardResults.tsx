"use client";

import type { BoardResult } from "@/types/search-everything";
import { BoardGlyph, Highlight, WorkspaceCrumb, boardHref, itemHref, type NavigateTo } from "../shared";

type BoardResultsProps = {
  boards: BoardResult[];
  term: string;
  onNavigate: NavigateTo;
};

/**
 * "Cross Boards": one row per board, "Board name | [badge] Workspace", and
 * under it the items that matched the term (by name or by tag).
 */
export default function BoardResults({ boards, term, onNavigate }: BoardResultsProps) {
  return (
    <div className="search-everything__board-list">
      {boards.map((board) => (
        <div key={board.id} className="search-everything__board">
          <button type="button" className="search-everything__board-row" onClick={() => onNavigate(boardHref(board))}>
            <BoardGlyph board={board} size={20} />
            <span className="search-everything__board-name">
              <Highlight text={board.label} term={term} />
            </span>
            <WorkspaceCrumb workspace={board.workspace} />
            {board.is_archived && <span className="search-everything__archived-badge">Archived</span>}
          </button>

          {board.matched_items.length > 0 && (
            <div className="search-everything__matched-items">
              {board.matched_items.map((item) => (
                <button key={item.id} type="button" className="search-everything__matched-item" onClick={() => onNavigate(itemHref(board, item))}>
                  <span className="search-everything__matched-dot" aria-hidden="true" />
                  <span className="truncate">
                    <Highlight text={item.name} term={term} />
                  </span>
                </button>
              ))}
              {board.matched_item_count > board.matched_items.length && (
                <span className="search-everything__matched-more">
                  {board.matched_item_count - board.matched_items.length} more matching items
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
