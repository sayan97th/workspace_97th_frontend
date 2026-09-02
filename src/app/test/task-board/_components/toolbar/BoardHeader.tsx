interface BoardHeaderProps {
  board_title: string;
}

export default function BoardHeader({ board_title }: BoardHeaderProps) {
  return (
    <div className="border-b border-[#e3e6ef] bg-white px-7 pt-[18px]">
      <div className="flex items-center gap-3">
        <div className="text-[22px] font-semibold tracking-[-0.01em] text-[#1e2237]">{board_title}</div>
        <div className="flex h-[18px] w-[18px] items-center justify-center text-[#6b7189]">
          <svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[18px] text-[13.5px] text-[#4a5068]">
          <span>Integrations</span>
          <span>Automations</span>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#dfe3ee] text-[11px] font-semibold text-[#5b6180]">MR</div>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-[22px] text-[13.5px]">
        <div className="border-b-2 border-[#4f6bed] pb-2.5 font-semibold text-[#1e2237]">Main table</div>
        <div className="pb-2.5 text-[#6b7189]">Timeline</div>
        <div className="pb-2.5 text-[#6b7189]">+</div>
      </div>
    </div>
  );
}
