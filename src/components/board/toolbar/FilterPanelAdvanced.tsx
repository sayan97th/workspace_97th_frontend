"use client";
import React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CloseIcon, PlusIcon } from "@/icons/board-icons";
import FilterRuleRow from "./FilterRuleRow";
import InlineFieldMenu from "./InlineFieldMenu";
import type { BoardFilterJoinOperator, BoardToolbarApi } from "./types";

export type FilterPanelAdvancedProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const JOIN_OPTIONS: { id: BoardFilterJoinOperator; label: string }[] = [
  { id: "and", label: "And" },
  { id: "or", label: "Or" },
];

const joinLabel = (operator: BoardFilterJoinOperator) => (operator === "or" ? "Or" : "And");

/**
 * The prefix in front of a rule, like monday: "Where" for the first one, an
 * And/Or picker for the second (which sets the operator for the whole level),
 * and a read-only echo of that operator for every rule after it.
 */
function JoinPrefix({
  index,
  operator,
  onChange,
}: {
  index: number;
  operator: BoardFilterJoinOperator;
  onChange: (operator: BoardFilterJoinOperator) => void;
}) {
  if (index === 0) {
    return <span className="text-[13.5px] font-semibold text-boardtree-text-secondary">Where</span>;
  }
  if (index === 1) {
    return (
      <InlineFieldMenu
        width={74}
        className="flex-none"
        options={JOIN_OPTIONS}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === operator}
        onSelect={(option) => onChange(option.id)}
        renderValue={() => <span className="text-[13.5px] font-semibold text-boardtree-text-secondary">{joinLabel(operator)}</span>}
        renderOption={(option) => <span>{option.label}</span>}
      />
    );
  }
  return <span className="pl-3 text-[13.5px] font-semibold text-boardtree-text-muted">{joinLabel(operator)}</span>;
}

/** A vertical drag and drop list of rules. Each level (top level, each group) reorders on its own. */
function SortableRuleList({
  rule_ids,
  onMove,
  children,
}: {
  rule_ids: string[];
  onMove: (active_id: string, over_id: string) => void;
  children: React.ReactNode;
}) {
  // A small drag threshold keeps a plain click on the handle from starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={rule_ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

function FilterPanelAdvanced<TRow>({ toolbar }: FilterPanelAdvancedProps<TRow>) {
  const top_level_count = toolbar.advanced_filter_rows.length + toolbar.advanced_filter_groups.length;

  return (
    <div className="px-5 pb-4 pt-0.5">
      {top_level_count === 0 && (
        <p className="pb-3 text-[13px] text-boardtree-text-muted">
          Build conditions on any column. Each column type offers its own conditions and values.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <SortableRuleList rule_ids={toolbar.advanced_filter_rows.map((rule) => rule.id)} onMove={toolbar.moveAdvancedFilterRow}>
          {toolbar.advanced_filter_rows.map((rule, index) => (
            <FilterRuleRow
              key={rule.id}
              toolbar={toolbar}
              rule={rule}
              prefix={<JoinPrefix index={index} operator={toolbar.advanced_filter_operator} onChange={toolbar.setAdvancedFilterOperator} />}
              onChange={(patch) => toolbar.updateAdvancedFilterRow(rule.id, patch)}
              onRemove={() => toolbar.removeAdvancedFilterRow(rule.id)}
              onDuplicate={() => toolbar.duplicateAdvancedFilterRow(rule.id)}
            />
          ))}
        </SortableRuleList>

        {toolbar.advanced_filter_groups.map((group, group_index) => (
          <div key={group.id} className="flex items-start gap-2.5">
            {/* Lines the group's prefix up with the rules' own, which start after a drag handle. */}
            <span className="w-[14px] flex-none" />
            <div className="flex w-[74px] flex-none items-center pt-3">
              <JoinPrefix
                index={toolbar.advanced_filter_rows.length + group_index}
                operator={toolbar.advanced_filter_operator}
                onChange={toolbar.setAdvancedFilterOperator}
              />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-boardtree-border bg-boardtree-hover/40 px-3 pb-3 pt-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-boardtree-text-muted">Condition group</span>
                <button
                  type="button"
                  onClick={() => toolbar.removeAdvancedFilterGroup(group.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-text"
                  aria-label="Remove condition group"
                >
                  <CloseIcon size={11} />
                </button>
              </div>
              <SortableRuleList
                rule_ids={group.rules.map((rule) => rule.id)}
                onMove={(active_id, over_id) => toolbar.moveAdvancedFilterGroupRule(group.id, active_id, over_id)}
              >
                {group.rules.map((rule, index) => (
                  <FilterRuleRow
                    key={rule.id}
                    toolbar={toolbar}
                    rule={rule}
                    prefix={
                      <JoinPrefix
                        index={index}
                        operator={group.join_operator}
                        onChange={(operator) => toolbar.setAdvancedFilterGroupOperator(group.id, operator)}
                      />
                    }
                    onChange={(patch) => toolbar.updateAdvancedFilterGroupRule(group.id, rule.id, patch)}
                    onRemove={() => toolbar.removeAdvancedFilterGroupRule(group.id, rule.id)}
                    onDuplicate={() => toolbar.duplicateAdvancedFilterGroupRule(group.id, rule.id)}
                  />
                ))}
              </SortableRuleList>
              <button
                type="button"
                onClick={() => toolbar.addAdvancedFilterGroupRule(group.id)}
                className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover"
              >
                <PlusIcon size={11} />
                New filter in group
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-5">
        <button
          type="button"
          onClick={toolbar.addAdvancedFilterRow}
          className="flex items-center gap-1.5 text-[13.5px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover"
        >
          <PlusIcon size={12} />
          New filter
        </button>
        <button
          type="button"
          onClick={toolbar.addAdvancedFilterGroup}
          className="flex items-center gap-1.5 text-[13.5px] font-semibold text-boardtree-text-secondary hover:text-boardtree-text"
        >
          <PlusIcon size={12} />
          New group
        </button>
      </div>
    </div>
  );
}

export default FilterPanelAdvanced;
