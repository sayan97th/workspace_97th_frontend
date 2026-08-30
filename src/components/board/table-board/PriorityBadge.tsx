import { PRIORITY_STYLES } from "./constants";
import type { BoardPriority } from "./types";

interface PriorityBadgeProps {
  priority: BoardPriority;
}

const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES[""];
  return (
    <div
      className="rounded-[4px] border px-[9px] py-[3px] text-[11.5px] font-medium"
      style={{ color: style.text_color, borderColor: style.border_color, background: style.background_color }}
    >
      {priority || "—"}
    </div>
  );
};

export default PriorityBadge;
