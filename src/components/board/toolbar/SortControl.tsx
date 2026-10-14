"use client";
import React, { useRef } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CloseIcon, DragHandleIcon, PlusIcon, SortAscendingIcon, SortDescendingIcon, SortIcon } from "@/icons/board-icons";
import { HelpIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardSortDirection, BoardSortJoinOperator, BoardSortRule, BoardToolbarApi, BoardToolbarViewActions } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import InlineFieldMenu from "./InlineFieldMenu";
import SaveViewButtons from "./SaveViewButtons";
import ToolbarButton from "./ToolbarButton";
import "./field-menu.css";
import "./filter-panel.css";
import "./toolbar-panel.css";

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
      className="filter-rule"
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="filter-rule__handle"
      >
        <DragHandleIcon />
      </button>

      {index > 0 && (
        <InlineFieldMenu
          width={84}
          className="flex-none"
          options={JOIN_OPERATOR_OPTIONS}
          getOptionId={(option) => option.id}
          isSelected={(option) => option.id === rule.join_operator}
          onSelect={(option) => toolbar.updateSortRule(rule.id, { join_operator: option.id })}
          renderValue={() => (
            <span className="field-menu__label">{JOIN_OPERATOR_OPTIONS.find((option) => option.id === rule.join_operator)?.label}</span>
          )}
          renderOption={(option) => <span>{option.label}</span>}
        />
      )}

      <InlineFieldMenu
        className="toolbar-panel__sort-column"
        menu_heading="Item columns"
        menu_max_height={640}
        options={toolbar.sort_options}
        getOptionId={(option) => option.id}
        getSearchText={(option) => option.label}
        search_placeholder="Search columns"
        empty_label="No columns found"
        isSelected={(option) => option.id === rule.sort_option_id}
        onSelect={(option) => toolbar.updateSortRule(rule.id, { sort_option_id: option.id })}
        onClear={selected_option ? () => toolbar.updateSortRule(rule.id, { sort_option_id: null }) : undefined}
        clear_label="Clear column"
        renderValue={() =>
          selected_option ? (
            <>
              {selected_option.swatch && <ColumnSwatchBadge swatch={selected_option.swatch} size={20} />}
              <span className="field-menu__label">{selected_option.label}</span>
            </>
          ) : (
            <span className="field-menu__placeholder">Choose column</span>
          )
        }
        renderOption={(option) => (
          <>
            {option.swatch && <ColumnSwatchBadge swatch={option.swatch} size={20} />}
            <span className="field-menu__label">{option.label}</span>
          </>
        )}
      />

      <InlineFieldMenu
        width={200}
        className="flex-none"
        options={DIRECTION_OPTIONS}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === rule.direction}
        onSelect={(option) => toolbar.updateSortRule(rule.id, { direction: option.id })}
        renderValue={() => (
          <>
            <selected_direction.Icon size={15} className="flex-none" />
            <span className="field-menu__label">{selected_direction.label}</span>
          </>
        )}
        renderOption={(option) => (
          <>
            <option.Icon size={15} className="flex-none" />
            <span>{option.label}</span>
          </>
        )}
      />

      <Tooltip content="Remove sort">
        <button type="button" onClick={() => toolbar.removeSortRule(rule.id)} className="filter-panel__icon-button" aria-label="Remove sort">
          <CloseIcon size={13} />
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * Sort button and its monday style panel: "Sort by" with a help tooltip, one row per rule (drag handle, column,
 * direction, remove) and "+ New sort". Styled by `filter-panel.css` and `toolbar-panel.css`; no `overflow: hidden`
 * on the card, so the column list can float past its bottom edge.
 */
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
      <Tooltip content="Sort by any column" className="flex">
        <ToolbarButton
          ref={button_ref}
          label="Sort"
          Icon={SortIcon}
          is_open={is_open}
          has_selection={active_rule_count > 0}
          variant="accent"
          badge_count={active_rule_count || undefined}
          onClick={() => toolbar.togglePanel("sort")}
        />
      </Tooltip>
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={640} unstyled>
        <div className="filter-panel toolbar-panel" role="dialog" aria-label="Sort by">
          <div className="filter-panel__header">
            <h2 className="filter-panel__title">Sort by</h2>
            <Tooltip placement="bottom" content="Rules apply top to bottom as tie breakers. Empty cells always go last.">
              <span className="filter-panel__help" tabIndex={0} aria-label="About sorting">
                <HelpIcon size={16} />
              </span>
            </Tooltip>
            <div className="filter-panel__header-actions">
              <button
                type="button"
                disabled={toolbar.sort_rules.length === 0}
                onClick={toolbar.clearSort}
                className="filter-panel__text-button"
              >
                Clear all
              </button>
              <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={active_rule_count === 0} />
            </div>
          </div>

          <div className="toolbar-panel__body">
            {toolbar.sort_rules.length === 0 && <p className="toolbar-panel__hint">No sort applied. Add one to order the items in every group.</p>}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={toolbar.sort_rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
                <div className="filter-panel__rules">
                  {toolbar.sort_rules.map((rule, index) => (
                    <SortRuleRow key={rule.id} toolbar={toolbar} rule={rule} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="toolbar-panel__add-row">
              <button type="button" onClick={toolbar.addSortRule} className="filter-panel__add-button">
                <PlusIcon size={14} />
                New sort
              </button>
            </div>
          </div>
        </div>
      </BoardPopover>
    </>
  );
}

export default SortControl;
