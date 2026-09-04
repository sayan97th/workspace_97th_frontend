import PopoverPanel from "./PopoverPanel";

interface ProgressMenuProps {
  value: number;
  onChange: (value: number) => void;
  onClear: () => void;
  onClose: () => void;
}

const PRESETS = [0, 25, 50, 75, 100];

export default function ProgressMenu({ value, onChange, onClear, onClose }: ProgressMenuProps) {
  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[244px] -translate-x-1/2 p-3.5">
      <div className="flex items-baseline gap-[7px] px-0.5 pb-2.5">
        <div className="font-mono text-[20px] font-medium text-boardtree-text">{value}%</div>
        <div className="text-[11.5px] text-boardtree-text-faint">complete</div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-boardtree-accent)]"
      />
      <div className="flex gap-1.5 pt-3">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onChange(p)}
            className="flex h-[26px] flex-1 items-center justify-center rounded-[5px] border border-boardtree-border text-[10.5px] text-boardtree-text-secondary hover:border-boardtree-accent hover:text-boardtree-accent"
          >
            {p}%
          </button>
        ))}
      </div>
      <button type="button" onClick={onClear} className="pt-3 text-[12px] text-boardtree-text-muted hover:text-boardtree-accent">
        Clear value
      </button>
    </PopoverPanel>
  );
}
