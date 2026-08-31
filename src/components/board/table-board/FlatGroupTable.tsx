import type { AddableColumnType } from "@/components/board/columnTypes";
import type { BoardCellOption, BoardCellPerson, BoardCellValue } from "@/components/board/cells/BoardValueCell";
import type { BoardOptionActions } from "@/components/board/cells/OptionPicker";
import CommentCountButton from "./CommentCountButton";
import { PEOPLE, PRIORITY_OPTIONS, TREE_GROUP_GRID_COLUMNS, getStatusBackground, getStatusForeground } from "./constants";
import { AddColumnFiller, computeDynamicColumnsExtraWidthPx, DynamicColumnCells, DynamicColumnHeaderCells, type DynamicColumnsBag } from "./DynamicColumns";
import PriorityBadge from "./PriorityBadge";
import ProgressBar from "./ProgressBar";
import type { BoardSimpleItem, TableBoardColumn } from "./types";

interface FlatGroupTableProps {
  items: BoardSimpleItem[];
  onAddItem: () => void;
  /** Same contract as {@link import("./TreeGroupTable").TableBoardTreeInteraction}'s dynamic-column fields — supplying `onAddColumn` renders the "+" header button; omit to keep the fixed column set with no "+" button. */
  columns?: TableBoardColumn[];
  people_cell_options?: BoardCellPerson[];
  onAddColumn?: (type: AddableColumnType) => void;
  onCommitCellValue?: (node_id: string, column_id: string, value: BoardCellValue) => void;
  onAddColumnOption?: (column_id: string, option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  makeColumnOptionActions?: (column_id: string) => BoardOptionActions;
}

const FlatGroupTable = ({
  items,
  onAddItem,
  columns,
  people_cell_options,
  onAddColumn,
  onCommitCellValue,
  onAddColumnOption,
  makeColumnOptionActions,
}: FlatGroupTableProps) => {
  const dynamic_bag: DynamicColumnsBag | null =
    columns && onCommitCellValue && onAddColumnOption && makeColumnOptionActions
      ? { columns, people: people_cell_options ?? [], onCommit: onCommitCellValue, onAddOption: onAddColumnOption, makeOptionActions: makeColumnOptionActions }
      : null;
  const extra_width_px = computeDynamicColumnsExtraWidthPx(columns, !!onAddColumn);
  const row_min_width_style = extra_width_px > 0 ? { minWidth: 1020 + extra_width_px } : undefined;

  return (
  <div className="w-fit rounded-lg bg-white shadow-[0_1px_2px_rgba(30,34,55,0.05)]" style={row_min_width_style}>
    {onAddColumn && (
      <div className="flex min-w-[1020px] items-stretch" style={row_min_width_style}>
        <div className={`grid flex-1 border-b border-[#eceef5] ${TREE_GROUP_GRID_COLUMNS}`}>
          <div className="h-[38px] border-r border-[#eceef5]" />
          <div className="flex h-[38px] items-center px-3 text-[12.5px] font-medium text-[#6b7189]">Item</div>
          <div className="h-[38px] border-r border-[#eceef5]" />
          <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Owner</div>
          <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Status</div>
          <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Date</div>
          <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Priority</div>
          <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Progress</div>
        </div>
        <DynamicColumnHeaderCells columns={columns ?? []} onAddColumn={onAddColumn} height_class="h-[38px]" />
      </div>
    )}

    {items.map((item) => {
      const owner = PEOPLE[item.owner_id];
      return (
        <div key={item.id} className="flex min-w-[1020px] items-stretch" style={row_min_width_style}>
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
          {dynamic_bag && <DynamicColumnCells node_id={item.id} values={item.values} bag={dynamic_bag} height_class="h-[42px]" />}
          {dynamic_bag && <AddColumnFiller height_class="h-[42px]" />}
        </div>
      );
    })}

    <div className="flex min-w-[1020px] items-stretch" style={row_min_width_style}>
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
};

export default FlatGroupTable;
