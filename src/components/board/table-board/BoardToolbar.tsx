import { FilterIcon, GroupByIcon, SearchIcon, SortIcon } from "./icons";

interface BoardToolbarProps {
  summary_label: string;
  onAddItem: () => void;
}

const BoardToolbar = ({ summary_label, onAddItem }: BoardToolbarProps) => (
  <div className="flex items-center gap-2 border-b border-[#eceef5] bg-white px-7 py-3.5">
    <button
      type="button"
      onClick={onAddItem}
      className="rounded-[6px] bg-[#4f6bed] px-3.5 py-2 text-[13.5px] font-medium text-white hover:bg-[#3a52c8]"
    >
      New item
    </button>

    <button type="button" className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] text-[#4a5068] hover:bg-[#f1f3f9]">
      <SearchIcon />
      Search
    </button>
    <button type="button" className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] text-[#4a5068] hover:bg-[#f1f3f9]">
      <FilterIcon />
      Filter
    </button>
    <button type="button" className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] text-[#4a5068] hover:bg-[#f1f3f9]">
      <SortIcon />
      Sort
    </button>
    <button type="button" className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] text-[#4a5068] hover:bg-[#f1f3f9]">
      <GroupByIcon />
      Group by
    </button>

    <div className="flex-1" />
    <div className="font-[family-name:var(--font-table-board-mono)] text-[11.5px] tracking-wide text-[#8b90a6]">{summary_label}</div>
  </div>
);

export default BoardToolbar;
