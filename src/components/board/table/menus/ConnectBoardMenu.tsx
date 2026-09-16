"use client";

import { useEffect, useState } from "react";
import { boardContentService } from "@/services/board-content.service";
import PopoverPanel from "./PopoverPanel";

interface ConnectBoardMenuProps {
  /** The other board this column's cells link items on, see `ColumnDef.linked_board_id`. */
  linked_board_id: string;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

/**
 * Search + toggleable item list for a Connect-board cell's popover, mirroring
 * `DependencyMenu`'s layout, its candidates come from `linked_board_id` (a
 * different board) instead of `state.groups`, so this owns its own fetch
 * rather than reading candidates off the table's own local state.
 */
export default function ConnectBoardMenu({ linked_board_id, selected, onToggle, onClose }: ConnectBoardMenuProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  useEffect(() => {
    let is_current = true;
    setIsLoading(true);
    boardContentService
      .getItems(Number(linked_board_id))
      .then((items) => {
        if (is_current) setCandidates(items.map((item) => ({ id: String(item.id), name: item.name })));
      })
      .finally(() => {
        if (is_current) setIsLoading(false);
      });
    return () => {
      is_current = false;
    };
  }, [linked_board_id]);

  const q = query.trim().toLowerCase();
  const filtered = candidates.filter((candidate) => candidate.name.toLowerCase().includes(q));

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[280px] -translate-x-1/2 p-3 pb-2.5">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items on the linked board"
        className="mb-2.5 h-8 w-full border-b border-boardtree-border px-1 text-[13px] text-boardtree-text outline-none"
      />
      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
        {filtered.map((candidate) => {
          const is_on = selected.includes(candidate.id);
          return (
            <button
              type="button"
              key={candidate.id}
              onClick={() => onToggle(candidate.id)}
              className="flex items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 hover:bg-boardtree-hover"
            >
              <span className="min-w-0 flex-1 truncate text-left text-[13px] text-boardtree-text">{candidate.name}</span>
              {is_on && (
                <svg viewBox="0 0 14 14" width="13" height="13" className="flex-none text-boardtree-accent">
                  <path d="M2.5 7.4 L5.7 10.6 L11.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {!is_loading && filtered.length === 0 && (
        <div className="px-1.5 pb-1.5 pt-1.5 text-[12.5px] text-boardtree-text-faint">
          {candidates.length === 0 ? "No items on the linked board yet." : "No matches"}
        </div>
      )}
      {is_loading && <div className="px-1.5 pb-1.5 pt-1.5 text-[12.5px] text-boardtree-text-faint">Loading…</div>}
    </PopoverPanel>
  );
}
