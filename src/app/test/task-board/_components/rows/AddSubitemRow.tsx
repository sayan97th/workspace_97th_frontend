interface AddSubitemRowProps {
  min_width: number;
  accent: string;
  onAdd: () => void;
}

export default function AddSubitemRow({ min_width, accent, onAdd }: AddSubitemRowProps) {
  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <div className="relative w-[35px] flex-none">
        <div className="absolute left-[3.5px] -top-px bottom-0 w-[1.5px]" style={{ background: `linear-gradient(${accent}, transparent 70%)` }} />
      </div>
      <button type="button" onClick={onAdd} className="flex h-9 items-center gap-1.5 pl-1 text-[12.5px] text-[#8b90a6] hover:text-[#4f6bed]">
        <svg viewBox="0 0 14 14" width="12" height="12"><path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Add subitem
      </button>
    </div>
  );
}
