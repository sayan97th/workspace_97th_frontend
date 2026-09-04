import CalendarGrid from "./CalendarGrid";
import PopoverPanel from "./PopoverPanel";

interface DateMenuProps {
  selected_iso?: string;
  accent?: string;
  onPick: (iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function DateMenu({ selected_iso, accent, onPick, onClear, onClose }: DateMenuProps) {
  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[268px] -translate-x-1/2 p-3">
      <CalendarGrid selected_iso={selected_iso} accent={accent} onPick={onPick} />
      <button type="button" onClick={onClear} className="pt-[11px] text-[12px] text-boardtree-text-muted hover:text-boardtree-accent">
        Clear date
      </button>
    </PopoverPanel>
  );
}
