"use client";

import { useEffect, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { WorkspaceContentItem } from "@/types/workspace";
import PopoverPanel from "./PopoverPanel";

interface BoardPickerMenuProps {
  onPick: (board_id: string) => void;
  onClose: () => void;
}

/**
 * Search + pick-a-board popover for the column menu's "Duplicate to another
 * board", mirroring `ConnectBoardMenu`'s layout and `ConfigEditorModal`'s
 * `ConnectBoardBody`, which already do this same "search + pick a board" job
 * for a Connect-board column's own target picker.
 */
export default function BoardPickerMenu({ onPick, onClose }: BoardPickerMenuProps) {
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState<WorkspaceContentItem[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  useEffect(() => {
    let is_current = true;
    workspaceService
      .getContentItems(1, 100, { asset_type: ["board"] })
      .then((page) => {
        if (is_current) setBoards(page.data);
      })
      .finally(() => {
        if (is_current) setIsLoading(false);
      });
    return () => {
      is_current = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = boards.filter((board) => board.label.toLowerCase().includes(q));

  return (
    <PopoverPanel onClose={onClose} className="top-full left-0 w-[280px] p-3 pb-2.5">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search boards"
        className="mb-2.5 h-8 w-full border-b border-boardtree-border px-1 text-[13px] text-boardtree-text outline-none"
      />
      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
        {filtered.map((board) => (
          <button
            type="button"
            key={board.id}
            onClick={() => onPick(String(board.id))}
            className="flex items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-left hover:bg-boardtree-hover"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-boardtree-text">{board.label}</span>
            {board.workspace && <span className="flex-none text-[11px] text-boardtree-text-faint">{board.workspace.name}</span>}
          </button>
        ))}
      </div>
      {!is_loading && filtered.length === 0 && (
        <div className="px-1.5 pb-1.5 pt-1.5 text-[12.5px] text-boardtree-text-faint">
          {boards.length === 0 ? "No other boards yet." : "No matches"}
        </div>
      )}
      {is_loading && <div className="px-1.5 pb-1.5 pt-1.5 text-[12.5px] text-boardtree-text-faint">Loading, please wait.</div>}
    </PopoverPanel>
  );
}
