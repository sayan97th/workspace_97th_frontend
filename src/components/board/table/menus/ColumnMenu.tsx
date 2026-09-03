"use client";

import { useState } from "react";
import PopoverPanel from "./PopoverPanel";

interface ColumnMenuProps {
  title: string;
  can_delete: boolean;
  sort_dir: "asc" | "desc" | null;
  onRename: (title: string) => void;
  onSort: (direction: "asc" | "desc" | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ROW_ITEM = "flex h-[34px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-[#262b45] hover:bg-[#f1f3f9]";

export default function ColumnMenu({ title, can_delete, sort_dir, onRename, onSort, onDuplicate, onDelete, onClose }: ColumnMenuProps) {
  const [draft, setDraft] = useState(title);

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[252px] -translate-x-1/2 p-2.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && onRename(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="mb-2 h-8 w-full rounded-[6px] border border-[#dfe3ef] px-2.5 text-[13px] text-[#262b45] outline-none focus:border-[#4f6bed]"
      />
      <div className="h-px bg-[#eceef5]" />
      <div className="flex flex-col gap-0.5 pt-1.5">
        <button type="button" onClick={() => onSort(sort_dir === "asc" ? null : "asc")} className={ROW_ITEM}>
          <span className="w-4 text-[#6b7189]">↑</span>
          <span className="flex-1">{sort_dir === "asc" ? "Remove ascending sort" : "Sort ascending"}</span>
        </button>
        <button type="button" onClick={() => onSort(sort_dir === "desc" ? null : "desc")} className={ROW_ITEM}>
          <span className="w-4 text-[#6b7189]">↓</span>
          <span className="flex-1">{sort_dir === "desc" ? "Remove descending sort" : "Sort descending"}</span>
        </button>
        <div className="my-1 h-px bg-[#eceef5]" />
        <button type="button" onClick={onDuplicate} className={ROW_ITEM}>
          <span className="w-4 text-[#6b7189]">⧉</span>
          <span className="flex-1">Duplicate column</span>
        </button>
        {can_delete && (
          <button type="button" onClick={onDelete} className="flex h-[34px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] text-[#b02f43] hover:bg-[#fdf2f4]">
            <span className="w-4 opacity-80">✕</span>
            <span className="flex-1">Delete column</span>
          </button>
        )}
      </div>
    </PopoverPanel>
  );
}
