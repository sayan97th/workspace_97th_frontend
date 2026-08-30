interface ProgressBarProps {
  progress_percent: number;
  fill_color?: string;
  show_label?: boolean;
}

const ProgressBar = ({ progress_percent, fill_color = "#4f6bed", show_label = true }: ProgressBarProps) => (
  <div className="flex flex-1 items-center gap-2">
    <div className="h-[6px] flex-1 overflow-hidden rounded-[3px] bg-[#e9ecf4]">
      <div className="h-[6px] rounded-[3px]" style={{ width: `${progress_percent}%`, background: fill_color }} />
    </div>
    {show_label && (
      <div className="w-8 shrink-0 text-right font-[family-name:var(--font-task-board-mono)] text-[10.5px] text-[#8b90a6]">{progress_percent}%</div>
    )}
  </div>
);

export default ProgressBar;
