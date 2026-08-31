import type { BoardCellOption, BoardOptionActions } from "@/components/board/cells/OptionPicker";
import CommentCountButton from "./CommentCountButton";
import DateCell from "./DateCell";
import EditableName from "./EditableName";
import { CheckIcon, DragHandleIcon } from "./icons";
import OwnerCell from "./OwnerCell";
import RailBar from "./RailBar";
import StatusCell from "./StatusCell";
import TreeConnector from "./TreeConnector";
import type { BoardSubitem, Person, TableBoardOption } from "./types";

interface SubitemRowProps {
  subitem: BoardSubitem;
  group_color: string;
  people: Person[];
  status_options: TableBoardOption[];
  /** Passed straight through to the Status cell's {@link StatusCell}. See its own doc for each. */
  status_full_options?: BoardCellOption[];
  status_option_actions?: BoardOptionActions;
  onCreateStatusOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  name_column_width_px: number;
  is_selected: boolean;
  is_editing: boolean;
  draft_name: string;
  is_status_menu_open: boolean;
  is_owner_menu_open: boolean;
  is_date_menu_open: boolean;
  is_dragged: boolean;
  onToggleSelected: () => void;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommitEdit: () => void;
  onOpenStatusMenu: () => void;
  onPickStatus: (option_id: string | null) => void;
  onOpenDateMenu: () => void;
  onPickDate: (date_string: string) => void;
  onOpenOwnerMenu: () => void;
  onToggleOwner: (person_id: string) => void;
  onClearOwners: () => void;
  onCloseMenus: () => void;
  onCommentClick?: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}

const SubitemRow = ({
  subitem,
  group_color,
  people,
  status_options,
  status_full_options,
  status_option_actions,
  onCreateStatusOption,
  name_column_width_px,
  is_selected,
  is_editing,
  draft_name,
  is_status_menu_open,
  is_owner_menu_open,
  is_date_menu_open,
  is_dragged,
  onToggleSelected,
  onStartEdit,
  onDraftChange,
  onCommitEdit,
  onOpenStatusMenu,
  onPickStatus,
  onOpenDateMenu,
  onPickDate,
  onOpenOwnerMenu,
  onToggleOwner,
  onClearOwners,
  onCloseMenus,
  onCommentClick,
  onDragStart,
  onDragOver,
  onDragEnd,
}: SubitemRowProps) => (
  <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} className="flex min-w-[1020px] items-stretch" style={{ opacity: is_dragged ? 0.45 : 1 }}>
    <RailBar variant="solid" color={group_color} />
    <TreeConnector line_color={group_color} height_px={21} />
    <div className="w-[5px] flex-none" style={{ background: group_color }} />
    <div
      className="grid flex-1 border-b border-[#eef0f7] border-r border-[#dfe3ef]"
      style={{ gridTemplateColumns: `34px ${name_column_width_px}px 52px 108px 156px 148px 44px 1fr`, background: is_selected ? "#eaf0ff" : "#ffffff" }}
    >
      <div className="flex h-10 items-center justify-center border-r border-[#eef0f7]">
        <button
          type="button"
          onClick={onToggleSelected}
          className={
            is_selected
              ? "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-[#4f6bed]"
              : "h-3.5 w-3.5 rounded-[3px] border-[1.5px] border-[#ccd1de] bg-white hover:border-[#4f6bed]"
          }
        >
          {is_selected && <CheckIcon size={9} />}
        </button>
      </div>

      <div className="relative flex h-10 items-center gap-1.5 border-r border-[#eef0f7] py-0 pl-2 pr-3">
        <div className="flex w-[11px] flex-none cursor-grab items-center text-[#d6dae6]">
          <DragHandleIcon size={11} />
        </div>
        <EditableName
          name={subitem.name}
          is_editing={is_editing}
          draft_value={draft_name}
          text_size_class="text-[13px]"
          input_padding_left_px={25}
          onStartEdit={onStartEdit}
          onDraftChange={onDraftChange}
          onCommit={onCommitEdit}
        />
      </div>

      <div className="flex h-10 items-center justify-center border-r border-[#eef0f7]">
        <CommentCountButton comment_count={subitem.comment_count} onClick={onCommentClick} />
      </div>

      <OwnerCell
        people={people}
        owner_ids={subitem.owner_ids}
        is_menu_open={is_owner_menu_open}
        avatar_size_px={25}
        onOpenMenu={onOpenOwnerMenu}
        onToggleOwner={onToggleOwner}
        onClearOwners={onClearOwners}
        onCloseMenu={onCloseMenus}
        menu_top_offset_px={38}
      />

      <StatusCell
        value={subitem.status}
        options={status_options}
        is_menu_open={is_status_menu_open}
        text_size_class="text-[12px]"
        onOpenMenu={onOpenStatusMenu}
        onPickStatus={onPickStatus}
        onCloseMenu={onCloseMenus}
        menu_top_offset_px={38}
        full_options={status_full_options}
        option_actions={status_option_actions}
        onCreateOption={onCreateStatusOption}
      />

      <DateCell
        value={subitem.date}
        is_menu_open={is_date_menu_open}
        text_size_class="text-xs"
        border_color="#eef0f7"
        onOpenMenu={onOpenDateMenu}
        onPickDate={onPickDate}
        onCloseMenu={onCloseMenus}
        menu_top_offset_px={38}
      />
      <div className="h-10" />
      <div className="h-10" />
    </div>
  </div>
);

export default SubitemRow;
