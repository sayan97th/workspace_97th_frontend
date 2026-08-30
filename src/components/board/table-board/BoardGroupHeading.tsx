import { ChevronDownIcon, ChevronRightIcon } from "./icons";

interface BoardGroupHeadingProps {
  label: string;
  count_label: string;
  accent_color: string;
  chevron_direction: "down" | "right";
  className?: string;
}

const BoardGroupHeading = ({ label, count_label, accent_color, chevron_direction, className = "" }: BoardGroupHeadingProps) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div style={{ color: accent_color }} className="flex items-center">
      {chevron_direction === "down" ? <ChevronDownIcon /> : <ChevronRightIcon />}
    </div>
    <div className="text-base font-semibold" style={{ color: accent_color }}>
      {label}
    </div>
    <div className="font-[family-name:var(--font-table-board-mono)] text-[11px] text-[#9aa0b6]">{count_label}</div>
  </div>
);

export default BoardGroupHeading;
