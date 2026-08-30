import { TREE_GROUP_GRID_COLUMNS } from "./constants";
import AddSubitemRow from "./AddSubitemRow";
import ItemRow from "./ItemRow";
import SubitemHeaderRow from "./SubitemHeaderRow";
import SubitemRow from "./SubitemRow";
import { computeItemProgress, type UseTaskBoardReturn } from "./useTaskBoard";

interface TreeGroupTableProps {
  board: UseTaskBoardReturn;
}

const MIN_NAME_COLUMN_PX = 150;
const MAX_NAME_COLUMN_PX = 340;

const computeNameColumnWidth = (names: string[]): number => {
  const longest_length = names.reduce((max_length, name) => Math.max(max_length, name.length), 0);
  return Math.min(MAX_NAME_COLUMN_PX, Math.max(MIN_NAME_COLUMN_PX, Math.round(longest_length * 6.9) + 53));
};

const TreeGroupTable = ({ board }: TreeGroupTableProps) => (
  <div>
    <div className="flex min-w-[1020px] items-stretch bg-white">
      <div className="w-[5px] flex-none rounded-tl-[3px] bg-[#4f6bed]" />
      <div className={`grid flex-1 border-b border-[#e3e6ef] ${TREE_GROUP_GRID_COLUMNS}`}>
        <div className="h-[38px] border-r border-[#eceef5]" />
        <div className="flex h-[38px] items-center px-3 text-[12.5px] font-medium text-[#6b7189]">Item</div>
        <div className="h-[38px] border-r border-[#eceef5]" />
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Owner</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Status</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Date</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Priority</div>
        <div className="flex h-[38px] items-center justify-center text-[12.5px] font-medium text-[#6b7189]">Progress</div>
      </div>
    </div>

    {board.tree_items.map((item) => {
      const is_open = !!board.open_ids[item.id];
      const name_column_width_px = computeNameColumnWidth(item.subitems.map((subitem) => subitem.name));

      return (
        <div key={item.id}>
          <ItemRow
            item={item}
            is_open={is_open}
            is_selected={!!board.selected_ids[item.id]}
            is_editing={board.editing_id === item.id}
            draft_name={board.draft_name}
            is_status_menu_open={board.status_menu_id === item.id}
            is_owner_menu_open={board.owner_menu_id === item.id}
            is_dragged={board.dragged_node_id === item.id}
            progress_percent={computeItemProgress(item)}
            onToggleOpen={() => board.toggleItemOpen(item.id)}
            onToggleSelected={() => board.toggleSelected(item.id)}
            onStartEdit={() => board.startEditing(item.id, item.name)}
            onDraftChange={board.updateDraftName}
            onCommitEdit={board.commitEdit}
            onOpenStatusMenu={() => board.openStatusMenu(item.id)}
            onPickStatus={(status) => board.setStatus(item.id, status)}
            onOpenOwnerMenu={() => board.openOwnerMenu(item.id)}
            onToggleOwner={(person_id) => board.toggleOwner(item.id, person_id)}
            onClearOwners={() => board.clearOwners(item.id)}
            onCloseMenus={board.closeMenus}
            onAddSubitem={() => board.addSubitem(item.id)}
            onDragStart={() => board.handleDragStart(item.id, "ROOT")}
            onDragOver={(event) => board.handleDragOver(event, item.id, "ROOT")}
            onDragEnd={board.handleDragEnd}
          />

          {is_open && (
            <>
              <SubitemHeaderRow name_column_width_px={name_column_width_px} />

              {item.subitems.map((subitem) => (
                <SubitemRow
                  key={subitem.id}
                  subitem={subitem}
                  name_column_width_px={name_column_width_px}
                  is_selected={!!board.selected_ids[subitem.id]}
                  is_editing={board.editing_id === subitem.id}
                  draft_name={board.draft_name}
                  is_status_menu_open={board.status_menu_id === subitem.id}
                  is_owner_menu_open={board.owner_menu_id === subitem.id}
                  is_dragged={board.dragged_node_id === subitem.id}
                  onToggleSelected={() => board.toggleSelected(subitem.id)}
                  onStartEdit={() => board.startEditing(subitem.id, subitem.name)}
                  onDraftChange={board.updateDraftName}
                  onCommitEdit={board.commitEdit}
                  onOpenStatusMenu={() => board.openStatusMenu(subitem.id)}
                  onPickStatus={(status) => board.setStatus(subitem.id, status)}
                  onOpenOwnerMenu={() => board.openOwnerMenu(subitem.id)}
                  onToggleOwner={(person_id) => board.toggleOwner(subitem.id, person_id)}
                  onClearOwners={() => board.clearOwners(subitem.id)}
                  onCloseMenus={board.closeMenus}
                  onDragStart={() => board.handleDragStart(subitem.id, item.id)}
                  onDragOver={(event) => board.handleDragOver(event, subitem.id, item.id)}
                  onDragEnd={board.handleDragEnd}
                />
              ))}

              <AddSubitemRow onAddSubitem={() => board.addSubitem(item.id)} />
              <div className="h-4 min-w-[1020px]" />
            </>
          )}
        </div>
      );
    })}

    <div className="flex min-w-[1020px] items-stretch bg-white">
      <div className="w-[5px] flex-none rounded-bl-[3px] bg-[#c3cef9]" />
      <div className="grid flex-1 grid-cols-[36px_1fr] border-t border-[#eceef5]">
        <div className="flex h-10 items-center justify-center border-r border-[#eceef5]">
          <div className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-[#e2e5ee] bg-white" />
        </div>
        <button type="button" onClick={board.addTreeItem} className="flex h-10 items-center pl-6 pr-3 text-left text-[13px] text-[#8b90a6] hover:text-[#4f6bed]">
          + Add item
        </button>
      </div>
    </div>
  </div>
);

export default TreeGroupTable;
