import type { StatusDef } from "../../_types/board.types";
import PopoverPanel from "./PopoverPanel";

interface DropdownMenuProps {
  options: StatusDef[];
  selected: string[];
  onToggle: (label: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function DropdownMenu({ options, selected, onToggle, onClear, onClose }: DropdownMenuProps) {
  const visible = options.filter((d) => d.label);
  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[260px] -translate-x-1/2 p-3">
      <div className="flex flex-col gap-0.5">
        {visible.length === 0 && <div className="px-1 pb-1.5 pt-0.5 text-[12px] text-[#a4aac2]">No options yet.</div>}
        {visible.map((def) => {
          const is_on = selected.includes(def.label);
          return (
            <button
              type="button"
              key={def.id}
              onClick={() => onToggle(def.label)}
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
      <div className="my-2.5 h-px bg-[#eceef5]" />
      <button type="button" onClick={onClear} className="pt-0.5 text-[12px] text-[#8b90a6] hover:text-[#4f6bed]">
        Clear value
      </button>
    </PopoverPanel>
  );
}
