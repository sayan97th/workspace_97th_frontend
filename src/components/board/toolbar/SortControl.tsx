"use client";
import React, { useRef } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CloseIcon, DragHandleIcon, PlusIcon, SortAscendingIcon, SortDescendingIcon, SortIcon } from "@/icons/board-icons";
import { InfoIcon } from "@/icons/workspace-icons";
import type { BoardSortDirection, BoardSortJoinOperator, BoardSortRule, BoardToolbarApi, BoardToolbarViewActions } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import InlineFieldMenu from "./InlineFieldMenu";
import SaveViewButtons from "./SaveViewButtons";
import ToolbarButton from "./ToolbarButton";

export type SortControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

const DIRECTION_OPTIONS: { id: BoardSortDirection; label: string; Icon: typeof SortAscendingIcon }[] = [
  { id: "asc", label: "Ascending", Icon: SortAscendingIcon },
  { id: "desc", label: "Descending", Icon: SortDescendingIcon },
];

const JOIN_OPERATOR_OPTIONS: { id: BoardSortJoinOperator; label: string }[] = [
  { id: "and", label: "And" },
  { id: "or", label: "Or" },
];

type SortRuleRowProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  rule: BoardSortRule;
  index: number;
};

/** One sort rule. The drag handle is the only drag activator, so the pickers inside the row stay clickable. */
function SortRuleRow<TRow>({ toolbar, rule, index }: SortRuleRowProps<TRow>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  const selected_option = toolbar.sort_options.find((option) => option.id === rule.sort_option_id);
  const selected_direction = DIRECTION_OPTIONS.find((option) => option.id === rule.direction) ?? DIRECTION_OPTIONS[0];

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg ${isDragging ? "relative z-10 bg-boardtree-surface shadow-lg shadow-black/30" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex flex-none cursor-grab touch-none text-boardtree-text-faint hover:text-boardtree-text active:cursor-grabbing"
      >
        <DragHandleIcon />
      </button>

      {index > 0 && (
        <InlineFieldMenu
          width={92}
          className="flex-none"
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
        getSearchText={(option) => option.label}
        search_placeholder="Search columns"
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
        className="flex-none"
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
}

function SortControl<TRow>({ toolbar, view_actions }: SortControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const is_open = toolbar.active_panel === "sort";
  const active_rule_count = toolbar.sort_rules.filter((rule) => rule.sort_option_id).length;
  // A small distance threshold, so a plain click on the handle never starts a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) toolbar.moveSortRule(String(active.id), String(over.id));
  };

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
          <span className="flex items-center text-boardtree-text-faint" title="Rules apply top to bottom as tie-breakers. Empty cells always go last.">
            <InfoIcon size={15} />
          </span>
          <div className="flex-1" />
          <SaveViewButtons view_actions={view_actions} />
        </div>

        <div className="flex flex-col gap-2.5 px-5 pb-1 pt-0.5">
          {toolbar.sort_rules.length === 0 && (
            <p className="pb-2 text-[13px] text-boardtree-text-muted">No sort applied.</p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={toolbar.sort_rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
              {toolbar.sort_rules.map((rule, index) => (
                <SortRuleRow key={rule.id} toolbar={toolbar} rule={rule} index={index} />
              ))}
            </SortableContext>
          </DndContext>
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
