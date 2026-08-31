import CommentCountButton from "./CommentCountButton";
import { TREE_GROUP_GRID_COLUMNS } from "./constants";
import EditableName from "./EditableName";
import { ChevronDownIcon, ChevronRightIcon, DragHandleIcon, PlusCircleIcon, CheckIcon } from "./icons";
import OwnerCell from "./OwnerCell";
import PriorityBadge from "./PriorityBadge";
import ProgressBar from "./ProgressBar";
import StatusCell from "./StatusCell";
import type { BoardItem, Person, TableBoardOption } from "./types";

interface ItemRowProps {
  item: BoardItem;
  group_color: string;
  people: Person[];
  status_options: TableBoardOption[];
  priority_options: TableBoardOption[];
  is_open: boolean;
  is_selected: boolean;
  is_editing: boolean;
  draft_name: string;
  is_status_menu_open: boolean;
  is_owner_menu_open: boolean;
  is_dragged: boolean;
  progress_percent: number;
  onToggleOpen: () => void;
  onToggleSelected: () => void;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommitEdit: () => void;
  onOpenStatusMenu: () => void;
  onPickStatus: (option_id: string | null) => void;
  onOpenOwnerMenu: () => void;
  onToggleOwner: (person_id: string) => void;
  onClearOwners: () => void;
  onCloseMenus: () => void;
  onAddSubitem: () => void;
  onCommentClick?: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}

const ItemRow = ({
  item,
  group_color,
  people,
  status_options,
  priority_options,
  is_open,
  is_selected,
  is_editing,
  draft_name,
  is_status_menu_open,
  is_owner_menu_open,
  is_dragged,
  progress_percent,
  onToggleOpen,
  onToggleSelected,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onOpenStatusMenu,
  onPickStatus,
  onOpenOwnerMenu,
  onToggleOwner,
  onClearOwners,
  onCloseMenus,
  onAddSubitem,
  onCommentClick,
  onDragStart,
  onDragOver,
  onDragEnd,
}: ItemRowProps) => {
  const subitem_count = item.subitems.length;
  const priority_option = priority_options.find((option) => option.id === item.priority) ?? null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className="flex min-w-[1020px] items-stretch"
      style={{ background: is_selected ? "#eaf0ff" : "#ffffff", opacity: is_dragged ? 0.45 : 1 }}
    >
      <div className="w-[5px] flex-none" style={{ background: group_color }} />
      <div className={`flex-1 grid border-b border-[#eceef5] ${TREE_GROUP_GRID_COLUMNS}`}>
        <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
          <button
            type="button"
            onClick={onToggleSelected}
            className={
              is_selected
                ? "flex h-[15px] w-[15px] items-center justify-center rounded-[3px] bg-[#4f6bed]"
                : "h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-[#c6cbd8] bg-white hover:border-[#4f6bed]"
            }
          >
            {is_selected && <CheckIcon />}
          </button>
        </div>

        <div className="relative flex h-[42px] items-center gap-2 border-r border-[#eceef5] py-0 pl-1 pr-3">
          <div className="flex w-3 flex-none cursor-grab items-center justify-center text-[#cfd4e2]">
            <DragHandleIcon />
          </div>
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex h-5 w-5 flex-none items-center justify-center rounded text-[#6b7189] hover:bg-[#eef1f9] hover:text-[#1e2237]"
          >
            {is_open ? <ChevronDownIcon size={11} /> : <ChevronRightIcon size={11} />}
          </button>

          <EditableName
            name={item.name}
            is_editing={is_editing}
            draft_value={draft_name}
            text_size_class="text-[13px] font-normal"
            input_padding_left_px={40}
            onStartEdit={onStartEdit}
            onDraftChange={onDraftChange}
            onCommit={onCommitEdit}
          />

          {subitem_count > 0 && (
            <button
              type="button"
              onClick={onToggleOpen}
              className="flex-none rounded-full bg-[#eef1f9] px-[7px] py-0.5 font-[family-name:var(--font-table-board-mono)] text-[10.5px] text-[#5b6180]"
            >
              {subitem_count}
            </button>
          )}
          <button
            type="button"
            onClick={onAddSubitem}
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[#a4aac2] hover:bg-[#eef1f9] hover:text-[#4f6bed]"
          >
            <PlusCircleIcon />
          </button>
        </div>

        <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
          <CommentCountButton comment_count={item.comment_count} onClick={onCommentClick} />
        </div>

        <OwnerCell
          people={people}
          owner_ids={item.owner_ids}
          is_menu_open={is_owner_menu_open}
          avatar_size_px={27}
          onOpenMenu={onOpenOwnerMenu}
          onToggleOwner={onToggleOwner}
          onClearOwners={onClearOwners}
          onCloseMenu={onCloseMenus}
          menu_top_offset_px={40}
        />

        <StatusCell
          value={item.status}
          options={status_options}
          is_menu_open={is_status_menu_open}
          text_size_class="text-[12.5px]"
          onOpenMenu={onOpenStatusMenu}
          onPickStatus={onPickStatus}
          onCloseMenu={onCloseMenus}
          menu_top_offset_px={40}
        />

        <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5] text-[12.5px] text-[#4a5068]">
          {item.date || "—"}
        </div>
        <div className="flex h-[42px] items-center justify-center border-r border-[#eceef5]">
          <PriorityBadge option={priority_option} />
        </div>
        <div className="flex h-[42px] items-center gap-2 px-3.5">
          <ProgressBar progress_percent={progress_percent} />
        </div>
      </div>
    </div>
  );
};

export default ItemRow;
