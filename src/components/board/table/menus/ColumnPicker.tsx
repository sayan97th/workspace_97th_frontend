"use client";

import { COLUMN_TYPE_GALLERY, type ColumnTypeDef } from "../constants";
import PopoverPanel from "./PopoverPanel";

interface ColumnPickerProps {
  query: string;
  onQueryChange: (value: string) => void;
  onPick: (type: ColumnTypeDef) => void;
  onClose: () => void;
  align?: "left" | "right";
}

const SECTIONS: ColumnTypeDef["section"][] = ["Essentials", "Super useful"];

export default function ColumnPicker({ query, onQueryChange, onPick, onClose, align = "right" }: ColumnPickerProps) {
  const q = query.trim().toLowerCase();
  return (
    <PopoverPanel onClose={onClose} className={`top-full w-[360px] p-4 ${align === "right" ? "right-0" : "left-0"}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-[8px] border-[1.5px] border-[#4f6bed] px-2.5">
          <svg viewBox="0 0 14 14" width="13" height="13" className="text-[#8b90a6]"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9.2 9.2 L12.4 12.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search or describe your column"
            className="flex-1 bg-transparent text-[13px] text-[#262b45] outline-none"
          />
        </div>
        <button type="button" onClick={onClose} className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#6b7189] hover:bg-[#f1f3f9]">
          <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>
      {SECTIONS.map((section) => {
        const items = COLUMN_TYPE_GALLERY.filter((t) => t.section === section && t.label.toLowerCase().includes(q));
        if (!items.length) return null;
        return (
          <div key={section} className="pt-3">
            <div className="pb-2 text-[11.5px] text-[#8b90a6]">{section}</div>
            <div className="grid grid-cols-2 gap-[2px_4px]">
              {items.map((type) => (
                <button
                  type="button"
                  key={type.kind}
                  onClick={() => { onPick(type); onClose(); }}
                  className="flex items-center gap-2.5 rounded-[7px] px-2 py-1.5 hover:bg-[#f4f6fb]"
                >
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] text-[11px] font-semibold text-white" style={{ background: type.accent }}>
                    {type.mark}
                  </span>
                  <span className="text-[13.5px] text-[#262b45]">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </PopoverPanel>
  );
}
