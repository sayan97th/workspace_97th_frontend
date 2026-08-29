"use client";
import React, { useRef } from "react";
import { CheckIcon, CommentIcon, GroupByIcon, SortAscendingIcon, SortDescendingIcon } from "@/icons/board-icons";
import { InfoIcon } from "@/icons/workspace-icons";
import { BOARD_DEFAULT_GROUP_BY_ID, type BoardSortDirection, type BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import InlineFieldMenu from "./InlineFieldMenu";
import ToolbarButton from "./ToolbarButton";

export type GroupByControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const DIRECTION_OPTIONS: { id: BoardSortDirection; label: string; Icon: typeof SortAscendingIcon }[] = [
  { id: "asc", label: "Ascending", Icon: SortAscendingIcon },
  { id: "desc", label: "Descending", Icon: SortDescendingIcon },
];

function GroupByControl<TRow>({ toolbar }: GroupByControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const is_open = toolbar.active_panel === "group";
  const is_non_default = toolbar.group_by_option_id !== BOARD_DEFAULT_GROUP_BY_ID;

  const column_options = toolbar.group_by_options.filter(
    (option) => option.id !== BOARD_DEFAULT_GROUP_BY_ID
  );
  const selected_option = column_options.find((option) => option.id === toolbar.group_by_option_id);
  const selected_direction =
    DIRECTION_OPTIONS.find((option) => option.id === toolbar.group_order_direction) ?? DIRECTION_OPTIONS[0];

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Group by"
        Icon={GroupByIcon}
        is_open={is_open}
        has_selection={is_non_default}
        onClick={() => toolbar.togglePanel("group")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={540}>
        <div className="flex items-center gap-[9px] px-5 pb-3.5 pt-4">
          <span className="text-[16px] font-bold text-boardtree-text">Group items by</span>
          <span className="flex items-center text-boardtree-text-faint" title="Groups rows by the selected column">
            <InfoIcon size={15} />
          </span>
          <div className="flex-1" />
          {is_non_default && (
            <button
              type="button"
              onClick={() => toolbar.setGroupByOptionId(BOARD_DEFAULT_GROUP_BY_ID)}
              className="mr-1 text-[13.5px] font-medium text-boardtree-text-muted hover:text-boardtree-text"
            >
              Clear
            </button>
          )}
          <div className="flex h-8 flex-none cursor-default items-center gap-[7px] rounded-lg border border-boardtree-border px-3.5 text-[13px] font-semibold text-boardtree-text-faint">
            Save as new view
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-5 pb-1.5 pt-0.5">
          <InlineFieldMenu
            menu_heading="Column options"
            menu_max_height={308}
            options={column_options}
            getOptionId={(option) => option.id}
            isSelected={(option) => option.id === toolbar.group_by_option_id}
            onSelect={(option) => toolbar.setGroupByOptionId(option.id)}
            renderValue={() =>
              selected_option ? (
                <>
                  {selected_option.swatch && <ColumnSwatchBadge swatch={selected_option.swatch} />}
                  <span className="truncate text-[13.5px] text-boardtree-text">{selected_option.label}</span>
                </>
              ) : (
                <span className="truncate text-[13.5px] text-boardtree-text-muted">Select or search column name</span>
              )
            }
            renderOption={(option) => (
              <>
                {option.swatch && <ColumnSwatchBadge swatch={option.swatch} size={22} />}
                <span>{option.label}</span>
              </>
            )}
          />

          <InlineFieldMenu
            width={210}
            options={DIRECTION_OPTIONS}
            getOptionId={(option) => option.id}
            isSelected={(option) => option.id === toolbar.group_order_direction}
            onSelect={(option) => toolbar.setGroupOrderDirection(option.id)}
            renderValue={() => (
              <>
                <selected_direction.Icon size={15} className="flex-none text-boardtree-text-muted" />
                <span className="truncate text-[13.5px] text-boardtree-text-secondary">{selected_direction.label}</span>
              </>
            )}
            renderOption={(option) => (
              <>
                <option.Icon size={15} className="flex-none text-boardtree-text-muted" />
                <span>{option.label}</span>
              </>
            )}
          />
        </div>

        <div className="px-5 pb-1 pt-2.5">
          <button
            type="button"
            onClick={() => toolbar.setShowEmptyGroups(!toolbar.show_empty_groups)}
            className="flex items-center gap-[9px] text-[13.5px] font-medium text-boardtree-text-secondary hover:text-boardtree-text"
          >
            <span
              className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
                toolbar.show_empty_groups ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"
              }`}
            >
              {toolbar.show_empty_groups && <CheckIcon size={10} className="text-white" />}
            </span>
            Show empty groups
          </button>
        </div>

        <div className="mt-1.5 flex items-center border-t border-boardtree-border-soft px-5 pb-4 pt-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-boardtree-text-muted">
            <CommentIcon size={15} />
            Give feedback
          </span>
        </div>
      </BoardPopover>
    </>
  );
}

export default GroupByControl;
