"use client";
import React, { useRef } from "react";
import { CloseIcon, DragHandleIcon, PlusIcon, SortAscendingIcon, SortDescendingIcon, SortIcon } from "@/icons/board-icons";
import { InfoIcon } from "@/icons/workspace-icons";
import type { BoardSortDirection, BoardSortJoinOperator, BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import InlineFieldMenu from "./InlineFieldMenu";
import ToolbarButton from "./ToolbarButton";

export type SortControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const DIRECTION_OPTIONS: { id: BoardSortDirection; label: string; Icon: typeof SortAscendingIcon }[] = [
  { id: "asc", label: "Ascending", Icon: SortAscendingIcon },
  { id: "desc", label: "Descending", Icon: SortDescendingIcon },
];

const JOIN_OPERATOR_OPTIONS: { id: BoardSortJoinOperator; label: string }[] = [
  { id: "and", label: "And" },
  { id: "or", label: "Or" },
];

function SortControl<TRow>({ toolbar }: SortControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const is_open = toolbar.active_panel === "sort";
  const active_rule_count = toolbar.sort_rules.filter((rule) => rule.sort_option_id).length;

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Sort"
        Icon={SortIcon}
        is_open={is_open}
        has_selection={active_rule_count > 0}
        badge_count={active_rule_count || undefined}
        onClick={() => toolbar.togglePanel("sort")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={620}>
        <div className="flex items-center gap-[9px] px-5 pb-3 pt-4">
          <span className="text-[16px] font-bold text-boardtree-text">Sort by</span>
          <span className="flex items-center text-boardtree-text-faint" title="Rules apply top to bottom as tie-breakers">
            <InfoIcon size={15} />
          </span>
          <div className="flex-1" />
          <div className="flex h-8 flex-none cursor-default items-center gap-[7px] rounded-lg border border-boardtree-border px-3.5 text-[13px] font-semibold text-boardtree-text-faint">
            Save as new view
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-5 pb-1 pt-0.5">
          {toolbar.sort_rules.length === 0 && (
            <p className="pb-2 text-[13px] text-boardtree-text-muted">No sort applied.</p>
          )}
          {toolbar.sort_rules.map((rule, index) => {
            const selected_option = toolbar.sort_options.find(
              (option) => option.id === rule.sort_option_id
            );
            const selected_direction =
              DIRECTION_OPTIONS.find((option) => option.id === rule.direction) ?? DIRECTION_OPTIONS[0];

            return (
              <div key={rule.id} className="flex items-center gap-2">
                <span className="flex flex-none cursor-grab text-boardtree-text-faint">
                  <DragHandleIcon />
                </span>

                {index > 0 && (
                  <InlineFieldMenu
                    width={92}
                    options={JOIN_OPERATOR_OPTIONS}
                    getOptionId={(option) => option.id}
                    isSelected={(option) => option.id === rule.join_operator}
                    onSelect={(option) => toolbar.updateSortRule(rule.id, { join_operator: option.id })}
                    renderValue={() => (
                      <span className="truncate text-[13.5px] font-medium text-boardtree-text-secondary">
                        {JOIN_OPERATOR_OPTIONS.find((option) => option.id === rule.join_operator)?.label}
                      </span>
                    )}
                    renderOption={(option) => <span>{option.label}</span>}
                  />
                )}

                <InlineFieldMenu
                  menu_heading="Item columns"
                  menu_max_height={308}
                  options={toolbar.sort_options}
                  getOptionId={(option) => option.id}
                  isSelected={(option) => option.id === rule.sort_option_id}
                  onSelect={(option) => toolbar.updateSortRule(rule.id, { sort_option_id: option.id })}
                  renderValue={() =>
                    selected_option ? (
                      <>
                        {selected_option.swatch && <ColumnSwatchBadge swatch={selected_option.swatch} />}
                        <span className="truncate text-[13.5px] text-boardtree-text">{selected_option.label}</span>
                      </>
                    ) : (
                      <span className="truncate text-[13.5px] text-boardtree-text-muted">Choose column</span>
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
                  width={188}
                  options={DIRECTION_OPTIONS}
                  getOptionId={(option) => option.id}
                  isSelected={(option) => option.id === rule.direction}
                  onSelect={(option) => toolbar.updateSortRule(rule.id, { direction: option.id })}
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

                <button
                  type="button"
                  onClick={() => toolbar.removeSortRule(rule.id)}
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-text"
                  aria-label="Remove sort"
                >
                  <CloseIcon size={13} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-[22px] px-5 pb-[18px] pt-3">
          <button
            type="button"
            onClick={toolbar.addSortRule}
            className="flex items-center gap-1.5 text-[13.5px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover"
          >
            <PlusIcon size={14} />
            New sort
          </button>
          {toolbar.sort_rules.length > 0 && (
            <button
              type="button"
              onClick={toolbar.clearSort}
              className="text-[13.5px] font-medium text-boardtree-text-muted hover:text-boardtree-text"
            >
              Clear all
            </button>
          )}
        </div>
      </BoardPopover>
    </>
  );
}

export default SortControl;
