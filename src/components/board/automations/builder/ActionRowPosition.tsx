"use client";
import React from "react";
import type { BoardAutomationActionParams } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import type { ActionPickerId, AutomationBuilderContext } from "./automationCatalog";
import { groupLabel, sortByLabel, sortDirectionOptions } from "./automationSentence";
import type { ActionDraft } from "./builderDraft";
import { PickerList, Token } from "./builderUi";
import { ColumnPicker, GroupPicker } from "./valueEditors";

/**
 * The sentences of the position actions: "move item to the top of its group" and "sort the item's
 * group by Priority, in label order". The API writes the order the same way a drag and drop does,
 * and keeps the order from before the run so it can be undone.
 */

export const POSITION_ACTION_IDS: ActionPickerId[] = ["move_item_position", "sort_group"];

/** Every kind a group can be sorted by, all but the button, which holds no value. */
const SORTABLE_KINDS: ColumnKind[] = [
  "status", "label", "text", "longtext", "number", "rating", "progress", "auto_number", "date", "timeline", "people", "dropdown", "tags",
  "checkbox", "email", "phone", "link", "vote", "files", "checklist", "time_tracking", "formula", "mirror", "connect_board", "dependency",
];

const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

export type PositionActionRowProps = {
  action: ActionDraft;
  context: AutomationBuilderContext;
  lead: "Then" | "and" | "Otherwise";
  has_trigger_item: boolean;
  renderSwitch: (label: string) => React.ReactNode;
  onPatch: (next: BoardAutomationActionParams) => void;
};

export default function ActionRowPosition({ action, context, lead, has_trigger_item, renderSwitch, onPatch }: PositionActionRowProps) {
  const params = action.params;

  if (action.picker_id === "move_item_position") {
    return (
      <>
        <Words>{lead} </Words>
        {renderSwitch("move item")} <Words>to the </Words>
        <Token label={params.position === "bottom" ? "bottom" : "top"} aria_label="Top or bottom" popover_width={220}>
          {(close) => (
            <PickerList
              is_searchable={false}
              sections={[{ entries: [{ id: "top", label: "Top" }, { id: "bottom", label: "Bottom" }] }]}
              selected={params.position === "bottom" ? "bottom" : "top"}
              onPick={(id) => { onPatch({ position: id === "bottom" ? "bottom" : "top" }); close(); }}
            />
          )}
        </Token>{" "}
        <Words>of its group</Words>
      </>
    );
  }

  const group_invalid = !params.from_item_group && params.target_group_id != null && !context.groups.some((group) => group.id === String(params.target_group_id));
  const group_label = params.from_item_group ? "the item's group" : group_invalid ? "deleted group" : groupLabel(context, params.target_group_id);
  const sort_column_invalid = params.sort_by === "column" && params.sort_column_id != null && !context.columns.some((column) => column.id === String(params.sort_column_id));
  const directions = sortDirectionOptions(context, params);

  return (
    <>
      <Words>{lead} </Words>
      {renderSwitch("sort")}{" "}
      <Token label={group_label} is_placeholder={!params.from_item_group && !params.target_group_id} is_invalid={group_invalid} aria_label="Which group">
        {(close) => (
          <GroupPicker
            groups={context.groups}
            selected={params.from_item_group ? "__item__" : params.target_group_id ? String(params.target_group_id) : null}
            extra_entries={has_trigger_item ? [{ id: "__item__", label: "The item's group" }] : []}
            onPick={(id) => {
              onPatch(id === "__item__" ? { from_item_group: true, target_group_id: null } : { from_item_group: false, target_group_id: Number(id) });
              close();
            }}
          />
        )}
      </Token>{" "}
      <Words>by </Words>
      <Token
        label={sort_column_invalid ? "deleted column" : sortByLabel(context, params)}
        is_placeholder={params.sort_by === "column" && !params.sort_column_id}
        is_invalid={sort_column_invalid}
        aria_label="Sort by"
        popover_width={280}
      >
        {(close) => (
          <>
            <PickerList
              is_searchable={false}
              sections={[{ title: "Item details", entries: [{ id: "name", label: "Item name" }, { id: "created_at", label: "Creation date" }] }]}
              selected={params.sort_by === "column" ? null : params.sort_by ?? "name"}
              onPick={(id) => { onPatch({ sort_by: id === "created_at" ? "created_at" : "name", sort_column_id: null }); close(); }}
            />
            <div className="mt-1 border-t border-boardtree-border-soft pt-1">
              <ColumnPicker
                context={context}
                kinds={SORTABLE_KINDS}
                selected={params.sort_by === "column" && params.sort_column_id ? String(params.sort_column_id) : null}
                onPick={(column_id) => { onPatch({ sort_by: "column", sort_column_id: Number(column_id) }); close(); }}
              />
            </div>
          </>
        )}
      </Token>
      <Words>, </Words>
      <Token label={params.direction === "desc" ? directions.desc : directions.asc} aria_label="Sort direction" popover_width={240}>
        {(close) => (
          <PickerList
            is_searchable={false}
            sections={[{ entries: [{ id: "asc", label: directions.asc }, { id: "desc", label: directions.desc }] }]}
            selected={params.direction === "desc" ? "desc" : "asc"}
            onPick={(id) => { onPatch({ direction: id === "desc" ? "desc" : "asc" }); close(); }}
          />
        )}
      </Token>
      <span className="ml-2 align-middle text-[12.5px] text-boardtree-text-faint">Empty values go last.</span>
    </>
  );
}
