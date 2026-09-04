import { useState } from "react";
import type { StatusDef } from "../types";
import { DROPDOWN_OPTION_COLORS } from "../constants";
import PopoverPanel from "./PopoverPanel";

interface DropdownMenuProps {
  options: StatusDef[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  /** Appends a new option to this column's list — the "New label" + Add row. */
  onAddOption: (label: string) => void;
  /** Renames an existing option — this column's own, never another column's. */
  onRenameOption: (id: string, label: string) => void;
  /** Recolors an existing option. */
  onRecolorOption: (id: string, color: string) => void;
  /** Permanently removes an existing option from this column. */
  onDeleteOption: (id: string) => void;
}

export default function DropdownMenu({
  options,
  selected,
  onToggle,
  onClear,
  onClose,
  onAddOption,
  onRenameOption,
  onRecolorOption,
  onDeleteOption,
}: DropdownMenuProps) {
  const [draft, setDraft] = useState("");
  const [is_editing, setIsEditing] = useState(false);
  const [color_picker_id, setColorPickerId] = useState<string | null>(null);
  const visible = options.filter((d) => d.label);

  const submitDraft = () => {
    const label = draft.trim();
    if (!label) return;
    onAddOption(label);
    setDraft("");
  };

  const toggleEditing = () => {
    setIsEditing((v) => !v);
    setColorPickerId(null);
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[260px] -translate-x-1/2 p-3">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#a4aac2]">
          {is_editing ? "Edit labels" : "Select an option"}
        </span>
        <button
          type="button"
          onClick={toggleEditing}
          title={is_editing ? "Done editing" : "Edit labels"}
          className={`flex h-6 w-6 flex-none items-center justify-center rounded-[5px] ${
            is_editing ? "bg-[#dfe4f6] text-[#4f6bed]" : "text-[#8b90a6] hover:bg-[#f1f3f9] hover:text-[#4f6bed]"
          }`}
        >
          <svg viewBox="0 0 16 16" width="13" height="13">
            <path d="M11.4 2.6 L13.4 4.6 L5.2 12.8 L2.6 13.4 L3.2 10.8 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        {visible.map((def) =>
          is_editing ? (
            <div key={def.id} className="relative flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={() => setColorPickerId(color_picker_id === def.id ? null : def.id)}
                className="h-6 w-6 flex-none rounded-[5px]"
                style={{ background: def.color }}
              />
              {color_picker_id === def.id && (
                <div className="absolute left-8 top-7 z-10 grid w-[152px] grid-cols-6 gap-1.5 rounded-[9px] border border-[#e3e6ef] bg-white p-2 shadow-[0_16px_44px_rgba(30,34,55,0.22)]">
                  {DROPDOWN_OPTION_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => { onRecolorOption(def.id, color); setColorPickerId(null); }}
                      className="h-5 w-5 rounded-[4px]"
                      style={{ background: color, boxShadow: color === def.color ? "0 0 0 2px rgba(30,34,55,0.55)" : "none" }}
                    />
                  ))}
                </div>
              )}
              <input
                value={def.label}
                onChange={(e) => onRenameOption(def.id, e.target.value)}
                className="h-7 flex-1 rounded-[6px] border border-transparent px-1.5 text-[12.5px] text-[#262b45] outline-none hover:border-[#e3e6ef] focus:border-[#4f6bed]"
              />
              <button
                type="button"
                onClick={() => onDeleteOption(def.id)}
                className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] text-[#a4aac2] hover:bg-[#fdf2f4] hover:text-[#b02f43]"
              >
                <svg viewBox="0 0 16 16" width="13" height="13">
                  <path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              key={def.id}
              onClick={() => onToggle(def.id)}
              className="flex items-center gap-2.5 rounded-[6px] px-[7px] py-1.5 hover:bg-[#f4f6fb]"
            >
              <span className="rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: def.color }}>{def.label}</span>
              <span className="flex-1" />
              {selected.includes(def.id) ? (
                <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[4px] bg-[#4f6bed]">
                  <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </span>
              ) : (
                <span className="h-[17px] w-[17px] rounded-[4px] border-[1.5px] border-[#ccd1de] bg-white" />
              )}
            </button>
          )
        )}
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
      {!is_editing && (
        <button type="button" onClick={onClear} className="mt-[9px] px-0.5 text-[12px] text-[#8b90a6] hover:text-[#4f6bed]">
          Clear value
        </button>
      )}
    </PopoverPanel>
  );
}
