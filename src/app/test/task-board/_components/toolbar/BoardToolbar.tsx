interface BoardToolbarProps {
  summary_text: string;
  onNewItem: () => void;
}

const TOOL_BUTTON = "flex items-center gap-1.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] text-[#4a5068] hover:bg-[#f1f3f9]";

export default function BoardToolbar({ summary_text, onNewItem }: BoardToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-[#eceef5] bg-white px-7 py-3.5">
      <button type="button" onClick={onNewItem} className="flex items-center rounded-[6px] bg-[#4f6bed] px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-[#3a52c8]">
        New item
      </button>
      <button type="button" className={TOOL_BUTTON}>
        <svg viewBox="0 0 14 14" width="13" height="13"><circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9.2 9.2 L12.4 12.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        Search
      </button>
      <button type="button" className={TOOL_BUTTON}>
        <svg viewBox="0 0 14 14" width="13" height="13"><path d="M1.5 3 H12.5 M3.5 7 H10.5 M5.5 11 H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        Filter
      </button>
      <button type="button" className={TOOL_BUTTON}>
        <svg viewBox="0 0 14 14" width="13" height="13"><path d="M4 2 V12 M4 12 L1.8 9.6 M10 12 V2 M10 2 L12.2 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        Sort
      </button>
      <button type="button" className={TOOL_BUTTON}>
        <svg viewBox="0 0 14 14" width="13" height="13"><rect x="1.6" y="2.4" width="10.8" height="3.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="1.6" y="8" width="10.8" height="3.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
        Group by
      </button>
      <div className="flex-1" />
      <div className="font-mono text-[11.5px] tracking-wide text-[#8b90a6]">{summary_text}</div>
    </div>
  );
}
