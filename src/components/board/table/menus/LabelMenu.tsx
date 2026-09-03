import type { StatusDef } from "../types";
import { pillColors } from "../colorUtils";
import PopoverPanel from "./PopoverPanel";

interface LabelMenuProps {
  label_defs: StatusDef[];
  selected: string[];
  onPick: (label: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function LabelMenu({ label_defs, selected, onPick, onClear, onClose }: LabelMenuProps) {
  const options = label_defs.filter((d) => d.label);
  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[220px] -translate-x-1/2 p-2.5">
      <div className="flex flex-col gap-0.5">
        {options.length === 0 && <div className="px-1 pb-1.5 pt-0.5 text-[12px] text-[#a4aac2]">No labels yet.</div>}
        {options.map((def) => {
          const pill = pillColors(def.color);
          const is_on = selected.includes(def.label);
          return (
            <button
              type="button"
              key={def.id}
              onClick={() => onPick(def.label)}
              className="flex items-center gap-2.5 rounded-[6px] px-[7px] py-1.5 hover:bg-[#f4f6fb]"
            >
              <span className="rounded-[4px] border px-2.5 py-0.5 text-[11.5px] font-medium" style={{ color: pill.fg, borderColor: pill.bd, background: pill.bg }}>
                {def.label}
              </span>
              <span className="flex-1" />
              {is_on && (
                <svg viewBox="0 0 14 14" width="12" height="12" className="text-[#4f6bed]">
                  <path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onClear} className="pt-2.5 text-[12px] text-[#8b90a6] hover:text-[#4f6bed]">
        Clear value
      </button>
    </PopoverPanel>
  );
}
