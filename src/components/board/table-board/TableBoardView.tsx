"use client";

import BoardGroupHeading from "./BoardGroupHeading";
import BoardToolbar from "./BoardToolbar";
import BoardTopBar from "./BoardTopBar";
import FlatGroupTable from "./FlatGroupTable";
import TreeGroupTable from "./TreeGroupTable";
import { computeItemProgress, useTableBoard } from "./useTableBoard";

const TableBoardView = () => {
  const board = useTableBoard();

  const tree_group_count_label = `${board.tree_items.length} items · ${board.total_subitem_count} subitems`;
  const flat_group_count_label = `${board.flat_items.length} items`;
  const summary_label = board.selected_count
    ? `${board.selected_count} selected`
    : `${board.total_subitem_count} subitems`;

  return (
    <div className="min-h-screen bg-[#f4f6fb] pb-[90px] text-[#1e2237]">
      <BoardTopBar
        board_name="Q3 Delivery Board"
        viewer_initials="MR"
        active_tab={board.active_tab}
        onChangeTab={board.setActiveTab}
      />

      {board.active_tab === "timeline" ? (
        <div className="flex flex-col items-center justify-center gap-2 px-7 py-24 text-center">
          <div className="text-base font-semibold text-[#4a5068]">Timeline view</div>
          <p className="max-w-sm text-sm text-[#8b90a6]">This view is not part of the current design preview. Switch back to Main table to see the tree of items and subitems.</p>
        </div>
      ) : (
        <>
          <BoardToolbar summary_label={summary_label} onAddItem={board.addTreeItem} />

          <div className="overflow-x-auto px-7 pt-[26px]">
            <BoardGroupHeading label="Checkout revamp" count_label={tree_group_count_label} accent_color="#4f6bed" chevron_direction="down" className="mb-2.5" />
            <div className="rounded-t-lg">
              <TreeGroupTable board={board} rows={board.tree_items} group_color="#4f6bed" onAddItem={board.addTreeItem} getProgress={computeItemProgress} />
            </div>

            <BoardGroupHeading label="Discovery" count_label={flat_group_count_label} accent_color="#2f9e78" chevron_direction="right" className="mb-2.5 mt-[30px]" />
            <FlatGroupTable
              items={board.flat_items}
              onAddItem={board.addFlatItem}
              columns={board.columns}
              people_cell_options={board.people_cell_options}
              onAddColumn={board.onAddColumn}
              onCommitCellValue={board.onCommitCellValue}
              onAddColumnOption={board.onAddColumnOption}
              makeColumnOptionActions={board.makeColumnOptionActions}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TableBoardView;
