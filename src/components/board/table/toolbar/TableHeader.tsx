interface TableHeaderProps {
  board_title: string;
}

export default function TableHeader({ board_title }: TableHeaderProps) {
  return (
    <div className="border-b border-boardtree-border bg-boardtree-surface px-7 pt-[18px]">
      <div className="flex items-center gap-3">
        <div className="text-[22px] font-semibold tracking-[-0.01em] text-boardtree-text">{board_title}</div>
        <div className="flex h-[18px] w-[18px] items-center justify-center text-boardtree-text-muted">
          <svg viewBox="0 0 12 12" width="12" height="12"><path d="M3 4.5 L6 8 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[18px] text-[13.5px] text-boardtree-text-secondary">
          <span>Integrations</span>
          <span>Automations</span>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#dfe3ee] text-[11px] font-semibold text-[#5b6180]">MR</div>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-[22px] text-[13.5px]">
        <div className="border-b-2 border-boardtree-accent pb-2.5 font-semibold text-boardtree-text">Main table</div>
        <div className="pb-2.5 text-boardtree-text-muted">Timeline</div>
        <div className="pb-2.5 text-boardtree-text-muted">+</div>
      </div>
    </div>
  );
}
