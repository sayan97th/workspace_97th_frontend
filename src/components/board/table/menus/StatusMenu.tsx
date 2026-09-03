import type { StatusDef } from "../types";
import { contrastFg } from "../colorUtils";
import PopoverPanel from "./PopoverPanel";

interface StatusMenuProps {
  status_defs: StatusDef[];
  onPick: (label: string) => void;
  onEditLabels: () => void;
  onClose: () => void;
}

export default function StatusMenu({ status_defs, onPick, onEditLabels, onClose }: StatusMenuProps) {
  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[470px] -translate-x-1/2 p-3.5">
      <div className="grid grid-cols-3 gap-2">
        {status_defs.filter((d) => d.label).map((def) => (
          <button
            type="button"
            key={def.id}
            onClick={() => onPick(def.label)}
            className="flex h-[30px] items-center justify-center rounded-[4px] text-[11.5px] font-medium hover:brightness-[1.07]"
            style={{ background: def.color, color: contrastFg(def.color) }}
          >
            {def.label}
          </button>
        ))}
      </div>
      <div className="my-3.5 h-px bg-[#eceef5]" />
      <button
        type="button"
        onClick={onEditLabels}
        className="flex h-10 w-full items-center justify-center gap-2 text-[13px] text-[#4a5068] hover:text-[#4f6bed]"
      >
        <svg viewBox="0 0 16 16" width="15" height="15"><path d="M10.6 2.4 L13.6 5.4 L5.6 13.4 L2.4 13.6 L2.6 10.4 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
        Edit Labels
      </button>
    </PopoverPanel>
  );
}
