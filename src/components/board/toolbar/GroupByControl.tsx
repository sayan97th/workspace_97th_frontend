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
          <span className="text-[16px] font-bold text-[#eef2f2]">Group items by</span>
          <span className="flex items-center text-[#6e7b7d]" title="Groups rows by the selected column">
            <InfoIcon size={15} />
          </span>
          <div className="flex-1" />
          {is_non_default && (
            <button
              type="button"
              onClick={() => toolbar.setGroupByOptionId(BOARD_DEFAULT_GROUP_BY_ID)}
              className="mr-1 text-[13.5px] font-medium text-[#9aa4a5] hover:text-[#e9eded]"
            >
              Clear
            </button>
          )}
          <div className="flex h-8 flex-none cursor-default items-center gap-[7px] rounded-lg border border-white/[0.12] px-3.5 text-[13px] font-semibold text-[#71807f]">
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
                  <span className="truncate text-[13.5px] text-[#e4e9e9]">{selected_option.label}</span>
                </>
              ) : (
                <span className="truncate text-[13.5px] text-[#8a9495]">Select or search column name</span>
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
                <selected_direction.Icon size={15} className="flex-none text-[#9aa4a5]" />
                <span className="truncate text-[13.5px] text-[#d3dada]">{selected_direction.label}</span>
              </>
            )}
            renderOption={(option) => (
              <>
                <option.Icon size={15} className="flex-none text-[#9aa4a5]" />
                <span>{option.label}</span>
              </>
            )}
          />
        </div>

        <div className="px-5 pb-1 pt-2.5">
          <button
            type="button"
            onClick={() => toolbar.setShowEmptyGroups(!toolbar.show_empty_groups)}
            className="flex items-center gap-[9px] text-[13.5px] font-medium text-[#c7d0d0] hover:text-[#e9eded]"
          >
            <span
              className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
                toolbar.show_empty_groups ? "border-brand-500 bg-brand-500" : "border-white/25"
              }`}
            >
              {toolbar.show_empty_groups && <CheckIcon size={10} className="text-white" />}
            </span>
            Show empty groups
          </button>
        </div>

        <div className="mt-1.5 flex items-center border-t border-white/[0.08] px-5 pb-4 pt-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-[#9aa4a5]">
            <CommentIcon size={15} />
            Give feedback
          </span>
        </div>
      </BoardPopover>
    </>
  );
}

export default GroupByControl;
