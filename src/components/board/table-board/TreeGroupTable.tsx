import type { AddableColumnType } from "@/components/board/columnTypes";
import type { BoardCellOption, BoardCellPerson, BoardCellValue } from "@/components/board/cells/BoardValueCell";
import type { BoardOptionActions } from "@/components/board/cells/OptionPicker";
import { TREE_GROUP_GRID_COLUMNS } from "./constants";
import { DynamicColumnHeaderCells, type DynamicColumnsBag } from "./DynamicColumns";
import AddSubitemRow from "./AddSubitemRow";
import ItemRow from "./ItemRow";
import RailBar from "./RailBar";
import SubitemHeaderRow from "./SubitemHeaderRow";
import SubitemRow from "./SubitemRow";
import type { BoardItem, DragParentId, Person, TableBoardColumn, TableBoardOption } from "./types";

/**
 * The subset of {@link import("./useTableBoard").UseTableBoardReturn} this
 * table actually needs — a real, backend-driven board builds an object of
 * this same shape (its own state/handlers, not the mock hook's), so this
 * component (and the row components it renders) work identically for both
 * the standalone design preview and the real board.
 */
export interface TableBoardTreeInteraction {
  open_ids: Record<string, boolean>;
  selected_ids: Record<string, boolean>;
  editing_id: string | null;
  draft_name: string;
  status_menu_id: string | null;
  owner_menu_id: string | null;
  date_menu_id: string | null;
  dragged_node_id: string | null;
  people: Person[];
  status_options: TableBoardOption[];
  /** A subitem row's own Status options — independent from {@link status_options}, mirroring the real board's separate item/subitem column scopes. Defaults to `status_options` when the caller has no separate subitem-scope status column (e.g. the standalone preview). */
  subitem_status_options?: TableBoardOption[];
  priority_options: TableBoardOption[];
  /** Every status option including inactive ones, with description. Feeds the "Edit Labels" panel. Omit to leave the panel showing only what {@link status_options} has (no description/inactive support). */
  status_options_full?: BoardCellOption[];
  /** Same as {@link status_options_full}, for a subitem row's own status column. Defaults to `status_options_full` when omitted. */
  subitem_status_options_full?: BoardCellOption[];
  /** Rename/recolor/delete/deactivate/describe an existing status option. Supplying this unlocks the "Edit Labels" footer link on the root-item Status menu; omit to keep it hidden (e.g. the standalone preview, which has no editing backend). */
  status_option_actions?: BoardOptionActions;
  /** Same as {@link status_option_actions}, for a subitem row's own status column. Defaults to `status_option_actions` when omitted. */
  subitem_status_option_actions?: BoardOptionActions;
  /** Creates a new status option and resolves to it with its persisted id, shared with the "Edit Labels" panel's own "+ New label" field. */
  onCreateStatusOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Same as {@link onCreateStatusOption}, for a subitem row's own status column. Defaults to `onCreateStatusOption` when omitted. */
  onCreateSubitemStatusOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  toggleItemOpen: (node_id: string) => void;
  toggleSelected: (node_id: string) => void;
  startEditing: (node_id: string, current_name: string) => void;
  updateDraftName: (value: string) => void;
  commitEdit: () => void;
  openStatusMenu: (node_id: string) => void;
  openOwnerMenu: (node_id: string) => void;
  openDateMenu: (node_id: string) => void;
  setStatus: (node_id: string, option_id: string | null) => void;
  setDate: (node_id: string, date: string) => void;
  toggleOwner: (node_id: string, person_id: string) => void;
  clearOwners: (node_id: string) => void;
  closeMenus: () => void;
  addSubitem: (item_id: string) => void;
  handleDragStart: (node_id: string, parent_id: DragParentId) => void;
  handleDragOver: (event: React.DragEvent, over_id: string, parent_id: DragParentId) => void;
  handleDragEnd: () => void;
  /** Opens a row's detail/comments — omit to keep the chat icon inert (the standalone preview has nowhere to open it to). */
  onCommentClick?: (node_id: string) => void;
  /**
   * Columns added at runtime via the trailing "+" header button. Omit (along
   * with the other `*Column*`/`onAddColumn` fields below) to render the
   * table's original fixed Owner/Status/Date/Priority/Progress set with no
   * "+" button at all — e.g. a caller that doesn't support this yet.
   */
  columns?: TableBoardColumn[];
  /** {@link BoardCellPerson}-shaped people list for dynamic People columns. Defaults to an empty list. */
  people_cell_options?: BoardCellPerson[];
  onAddColumn?: (type: AddableColumnType) => void;
  onCommitCellValue?: (node_id: string, column_id: string, value: BoardCellValue) => void;
  onAddColumnOption?: (column_id: string, option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  makeColumnOptionActions?: (column_id: string) => BoardOptionActions;
  /**
   * Whether a subitem row also shows cells for the item-scoped `columns`
   * above. Defaults to true (the standalone preview's columns aren't
   * scoped, so sharing them across item/subitem rows is harmless there); a
   * real board sets this to false since its dynamic columns are genuinely
   * item-scoped and have no meaning on a subitem row.
   */
  apply_dynamic_to_subitems?: boolean;
}

interface TreeGroupTableProps {
  board: TableBoardTreeInteraction;
  /** This group's own root items — a real board passes one call per group (table), each with its own `rows`/`group_color`/`onAddItem`. */
  rows: BoardItem[];
  group_color: string;
  onAddItem: () => void;
  /**
   * A root row's Progress column value — injected rather than computed here,
   * since "done" means something different per caller: the standalone
   * preview derives it from a subitem's `status` string (see
   * `computeItemProgress` in `useTableBoard.ts`), while the real board
   * derives it from an actual checkbox column's real values.
   */
  getProgress: (item: BoardItem) => number;
}

const MIN_NAME_COLUMN_PX = 150;
const MAX_NAME_COLUMN_PX = 340;

const computeNameColumnWidth = (names: string[]): number => {
  const longest_length = names.reduce((max_length, name) => Math.max(max_length, name.length), 0);
  return Math.min(MAX_NAME_COLUMN_PX, Math.max(MIN_NAME_COLUMN_PX, Math.round(longest_length * 6.9) + 53));
};

const TreeGroupTable = ({ board, rows, group_color, onAddItem, getProgress }: TreeGroupTableProps) => {
  const dynamic_bag: DynamicColumnsBag | null =
    board.columns && board.onCommitCellValue && board.onAddColumnOption && board.makeColumnOptionActions
      ? {
          columns: board.columns,
          people: board.people_cell_options ?? [],
          onCommit: board.onCommitCellValue,
          onAddOption: board.onAddColumnOption,
          makeOptionActions: board.makeColumnOptionActions,
        }
      : null;
  const subitem_dynamic_bag = board.apply_dynamic_to_subitems === false ? null : dynamic_bag;

  return (
  <div>
    <div className="flex min-w-[1020px] items-stretch bg-white">
      <div className="w-[5px] flex-none rounded-tl-[3px]" style={{ background: group_color }} />
      <div className={`grid flex-1 border-b border-[#e3e6ef] ${TREE_GROUP_GRID_COLUMNS}`}>
        <div className="h-[38px] border-r border-[#eceef5]" />
        <div className="flex h-[38px] items-center px-3 text-[12.5px] font-medium text-[#6b7189]">Item</div>
        <div className="h-[38px] border-r border-[#eceef5]" />
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Owner</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Status</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Date</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Priority</div>
        <div className="flex h-[38px] items-center justify-center border-r border-[#eceef5] text-[12.5px] font-medium text-[#6b7189]">Progress</div>
      </div>
      {board.onAddColumn && (
        <DynamicColumnHeaderCells columns={board.columns ?? []} onAddColumn={board.onAddColumn} height_class="h-[38px]" />
      )}
    </div>

    {rows.map((item) => {
      const is_open = !!board.open_ids[item.id];
      const name_column_width_px = computeNameColumnWidth(item.subitems.map((subitem) => subitem.name));

      return (
        <div key={item.id}>
          <ItemRow
            item={item}
            group_color={group_color}
            people={board.people}
            status_options={board.status_options}
            priority_options={board.priority_options}
            status_full_options={board.status_options_full}
            status_option_actions={board.status_option_actions}
            onCreateStatusOption={board.onCreateStatusOption}
            is_open={is_open}
            is_selected={!!board.selected_ids[item.id]}
            is_editing={board.editing_id === item.id}
            draft_name={board.draft_name}
            is_status_menu_open={board.status_menu_id === item.id}
            is_owner_menu_open={board.owner_menu_id === item.id}
            is_date_menu_open={board.date_menu_id === item.id}
            is_dragged={board.dragged_node_id === item.id}
            progress_percent={getProgress(item)}
            onToggleOpen={() => board.toggleItemOpen(item.id)}
            onToggleSelected={() => board.toggleSelected(item.id)}
            onStartEdit={() => board.startEditing(item.id, item.name)}
            onDraftChange={board.updateDraftName}
            onCommitEdit={board.commitEdit}
            onOpenStatusMenu={() => board.openStatusMenu(item.id)}
            onPickStatus={(option_id) => board.setStatus(item.id, option_id)}
            onOpenDateMenu={() => board.openDateMenu(item.id)}
            onPickDate={(date) => board.setDate(item.id, date)}
            onOpenOwnerMenu={() => board.openOwnerMenu(item.id)}
            onToggleOwner={(person_id) => board.toggleOwner(item.id, person_id)}
            onClearOwners={() => board.clearOwners(item.id)}
            onCloseMenus={board.closeMenus}
            onAddSubitem={() => board.addSubitem(item.id)}
            onCommentClick={board.onCommentClick ? () => board.onCommentClick?.(item.id) : undefined}
            onDragStart={() => board.handleDragStart(item.id, "ROOT")}
            onDragOver={(event) => board.handleDragOver(event, item.id, "ROOT")}
            onDragEnd={board.handleDragEnd}
            dynamic={dynamic_bag}
          />

          {is_open && (
            <>
              <SubitemHeaderRow group_color={group_color} name_column_width_px={name_column_width_px} />

              {item.subitems.map((subitem) => (
                <SubitemRow
                  key={subitem.id}
                  subitem={subitem}
                  group_color={group_color}
                  people={board.people}
                  status_options={board.subitem_status_options ?? board.status_options}
                  status_full_options={board.subitem_status_options_full ?? board.status_options_full}
                  status_option_actions={board.subitem_status_option_actions ?? board.status_option_actions}
                  onCreateStatusOption={board.onCreateSubitemStatusOption ?? board.onCreateStatusOption}
                  name_column_width_px={name_column_width_px}
                  is_selected={!!board.selected_ids[subitem.id]}
                  is_editing={board.editing_id === subitem.id}
                  draft_name={board.draft_name}
                  is_status_menu_open={board.status_menu_id === subitem.id}
                  is_owner_menu_open={board.owner_menu_id === subitem.id}
                  is_date_menu_open={board.date_menu_id === subitem.id}
                  is_dragged={board.dragged_node_id === subitem.id}
                  onToggleSelected={() => board.toggleSelected(subitem.id)}
                  onStartEdit={() => board.startEditing(subitem.id, subitem.name)}
                  onDraftChange={board.updateDraftName}
                  onCommitEdit={board.commitEdit}
                  onOpenStatusMenu={() => board.openStatusMenu(subitem.id)}
                  onPickStatus={(option_id) => board.setStatus(subitem.id, option_id)}
                  onOpenDateMenu={() => board.openDateMenu(subitem.id)}
                  onPickDate={(date) => board.setDate(subitem.id, date)}
                  onOpenOwnerMenu={() => board.openOwnerMenu(subitem.id)}
                  onToggleOwner={(person_id) => board.toggleOwner(subitem.id, person_id)}
                  onClearOwners={() => board.clearOwners(subitem.id)}
                  onCloseMenus={board.closeMenus}
                  onCommentClick={board.onCommentClick ? () => board.onCommentClick?.(subitem.id) : undefined}
                  onDragStart={() => board.handleDragStart(subitem.id, item.id)}
                  onDragOver={(event) => board.handleDragOver(event, subitem.id, item.id)}
                  onDragEnd={board.handleDragEnd}
                  dynamic={subitem_dynamic_bag}
                />
              ))}

              <AddSubitemRow group_color={group_color} onAddSubitem={() => board.addSubitem(item.id)} />
              <div className="flex min-w-[1020px] items-stretch">
                <RailBar variant="gap" color={group_color} />
                <div className="h-4 flex-1" />
              </div>
            </>
          )}
        </div>
      );
    })}

    <div className="flex min-w-[1020px] items-stretch bg-white">
      <div className="w-[5px] flex-none rounded-bl-[3px]" style={{ background: `color-mix(in srgb, ${group_color} 35%, white)` }} />
      <div className="grid flex-1 grid-cols-[36px_1fr] border-t border-[#eceef5]">
        <div className="flex h-10 items-center justify-center border-r border-[#eceef5]">
          <div className="h-[15px] w-[15px] rounded-[3px] border-[1.5px] border-[#e2e5ee] bg-white" />
        </div>
        <button type="button" onClick={onAddItem} className="flex h-10 items-center pl-6 pr-3 text-left text-[13px] text-[#8b90a6] hover:text-[#4f6bed]">
          + Add item
        </button>
      </div>
    </div>
  </div>
  );
};

export default TreeGroupTable;
