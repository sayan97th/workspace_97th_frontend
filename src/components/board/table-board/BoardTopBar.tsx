import { ChevronDownIcon } from "./icons";
import type { ActiveBoardTab } from "./types";

interface BoardTopBarProps {
  board_name: string;
  viewer_initials: string;
  active_tab: ActiveBoardTab;
  onChangeTab: (tab: ActiveBoardTab) => void;
}

const BoardTopBar = ({ board_name, viewer_initials, active_tab, onChangeTab }: BoardTopBarProps) => (
  <div className="border-b border-[#e3e6ef] bg-white px-7 pt-[18px]">
    <div className="flex items-center gap-3">
      <div className="text-[22px] font-semibold tracking-[-0.01em] text-[#1e2237]">{board_name}</div>
      <div className="flex h-[18px] w-[18px] items-center justify-center text-[#6b7189]">
        <ChevronDownIcon />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-[18px] text-[13.5px] text-[#4a5068]">
        <span className="cursor-pointer hover:text-[#1e2237]">Integrations</span>
        <span className="cursor-pointer hover:text-[#1e2237]">Automations</span>
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#dfe3ee] text-[11px] font-semibold text-[#5b6180]">
          {viewer_initials}
        </div>
      </div>
    </div>
    <div className="mt-3.5 flex items-center gap-[22px] text-[13.5px]">
      <button
        type="button"
        onClick={() => onChangeTab("main-table")}
        className={`border-b-2 px-0.5 pb-2.5 ${
          active_tab === "main-table" ? "border-[#4f6bed] font-semibold text-[#1e2237]" : "border-transparent text-[#6b7189]"
        }`}
      >
        Main table
      </button>
      <button
        type="button"
        onClick={() => onChangeTab("timeline")}
        className={`border-b-2 px-0.5 pb-2.5 ${
          active_tab === "timeline" ? "border-[#4f6bed] font-semibold text-[#1e2237]" : "border-transparent text-[#6b7189]"
        }`}
      >
        Timeline
      </button>
      <span className="cursor-default px-0.5 pb-2.5 text-[#6b7189]">+</span>
    </div>
  </div>
);

export default BoardTopBar;
