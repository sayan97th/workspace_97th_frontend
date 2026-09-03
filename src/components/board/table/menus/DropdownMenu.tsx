import { useState } from "react";
import type { StatusDef } from "../types";
import PopoverPanel from "./PopoverPanel";

interface DropdownMenuProps {
  options: StatusDef[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  /** Appends a new option to this column's list — the "New label" + Add row. */
  onAddOption: (label: string) => void;
}

export default function DropdownMenu({ options, selected, onToggle, onClear, onClose, onAddOption }: DropdownMenuProps) {
  const [draft, setDraft] = useState("");
  const visible = options.filter((d) => d.label);

  const submitDraft = () => {
    const label = draft.trim();
    if (!label) return;
    onAddOption(label);
    setDraft("");
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[260px] -translate-x-1/2 p-3">
      <div className="flex flex-col gap-0.5">
        {visible.map((def) => {
          const is_on = selected.includes(def.id);
          return (
            <button
              type="button"
              key={def.id}
              onClick={() => onToggle(def.id)}
              className="flex items-center gap-2.5 rounded-[6px] px-[7px] py-1.5 hover:bg-[#f4f6fb]"
            >
              <span className="rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: def.color }}>{def.label}</span>
              <span className="flex-1" />
              {is_on ? (
                <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[4px] bg-[#4f6bed]">
                  <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </span>
              ) : (
                <span className="h-[17px] w-[17px] rounded-[4px] border-[1.5px] border-[#ccd1de] bg-white" />
              )}
            </button>
          );
        })}
      </div>
      {visible.length === 0 && (
        <div className="px-[3px] pb-1.5 pt-0.5 text-[12px] text-[#a4aac2]">No labels yet. Create the first one below.</div>
      )}
      <div className="mt-2.5 h-px bg-[#eceef5]" />
      <div className="mt-[11px] flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitDraft();
            }
          }}
          placeholder="New label"
          className="h-[30px] min-w-0 flex-1 rounded-[6px] border border-[#dfe3ef] px-[9px] font-[inherit] text-[12.5px] text-[#262b45] outline-none"
        />
        <button
          type="button"
          onClick={submitDraft}
          disabled={!draft.trim()}
          className="flex h-[30px] flex-none items-center rounded-[6px] bg-[#4f6bed] px-[13px] text-[12.5px] font-medium text-white hover:bg-[#3a52c8] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-[#4f6bed]"
        >
          Add
        </button>
      </div>
      <button type="button" onClick={onClear} className="mt-[9px] px-0.5 text-[12px] text-[#8b90a6] hover:text-[#4f6bed]">
        Clear value
      </button>
    </PopoverPanel>
  );
}
