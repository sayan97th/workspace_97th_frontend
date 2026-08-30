import type { TableBoardOption } from "./types";

interface PriorityBadgeProps {
  option: TableBoardOption | null;
}

/** An outlined pill tinted from the option's own color — mirrors `BoardValueCell`'s `pill_style: "outline"` treatment for a priority-style status column, so the badge works for any real board's own priority option colors rather than a fixed palette. */
const PriorityBadge = ({ option }: PriorityBadgeProps) => {
  if (!option) {
    return (
      <div className="rounded-[4px] border border-[#e6e9f2] bg-white px-[9px] py-[3px] text-[11.5px] font-medium text-[#9aa0b6]">
        —
      </div>
    );
  }
  return (
    <div
      className="rounded-[4px] border px-[9px] py-[3px] text-[11.5px] font-medium"
      style={{ color: option.color, borderColor: `${option.color}55`, background: `${option.color}14` }}
    >
      {option.label}
    </div>
  );
};

export default PriorityBadge;
