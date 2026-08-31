import CommentCountButton from "./CommentCountButton";
import { PEOPLE, PRIORITY_OPTIONS, TREE_GROUP_GRID_COLUMNS, getStatusBackground, getStatusForeground } from "./constants";
import PriorityBadge from "./PriorityBadge";
import ProgressBar from "./ProgressBar";
import type { BoardSimpleItem } from "./types";

interface FlatGroupTableProps {
  items: BoardSimpleItem[];
  onAddItem: () => void;
}

const FlatGroupTable = ({ items, onAddItem }: FlatGroupTableProps) => (
  <div className="rounded-lg bg-white shadow-[0_1px_2px_rgba(30,34,55,0.05)]">
    {items.map((item) => {
      const owner = PEOPLE[item.owner_id];
      return (
        <div key={item.id} className="flex min-w-[1020px] items-stretch">
          <div className="w-[5px] flex-none bg-[#2f9e78]" />
          <div className={`grid flex-1 border-b border-[#eceef5] ${TREE_GROUP_GRID_COLUMNS}`}>
            <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
              <div className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-[#c6cbd8] bg-white" />
            </div>
            <div className="flex h-[42px] items-center gap-2 border-r border-[#eceef5] py-0 pl-1.5 pr-3">
              <div className="flex h-5 w-5 flex-none items-center justify-center text-[#6b7189]">
                <svg viewBox="0 0 12 12" width={11} height={11}>
                  <path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-[13.5px] font-medium text-[#1e2237]">{item.name}</div>
            </div>
            <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
              <CommentCountButton comment_count={item.comment_count} accent_color="#2f9e78" />
            </div>
            <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
              {owner ? (
                <div
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: owner.avatar_bg }}
                >
                  {owner.initials}
                </div>
              ) : (
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#dfe3ee] text-[10px] font-semibold text-[#5b6180]">—</div>
              )}
            </div>
            <div className="flex h-[42px] items-stretch border-r border-[#eceef5]">
              <div
                className="flex flex-1 items-center justify-center text-[12.5px] font-medium"
                style={{ background: getStatusBackground(item.status), color: getStatusForeground(item.status) }}
              >
                {item.status}
              </div>
            </div>
            <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5] text-[12.5px] text-[#4a5068]">{item.date || "—"}</div>
            <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
              <PriorityBadge option={PRIORITY_OPTIONS.find((option) => option.id === item.priority) ?? null} />
            </div>
            <div className="flex h-[42px] items-center gap-2 px-3.5">
              <ProgressBar progress_percent={item.progress} fill_color="#2f9e78" show_label={false} />
            </div>
          </div>
        </div>
      );
    })}

    <div className="flex min-w-[1020px] items-stretch">
      <div className="w-[5px] flex-none rounded-bl-[3px] bg-[#bfe4d5]" />
      <div className="grid flex-1 grid-cols-[36px_1fr]">
        <div className="flex h-10 items-center justify-center border-r border-[#eceef5]">
          <div className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-[#e2e5ee] bg-white" />
        </div>
        <button type="button" onClick={onAddItem} className="flex h-10 items-center pl-6 pr-3 text-left text-[13px] text-[#8b90a6] hover:text-[#2f9e78]">
          + Add item
        </button>
      </div>
    </div>
  </div>
);

export default FlatGroupTable;
