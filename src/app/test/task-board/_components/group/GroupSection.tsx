"use client";

import { Fragment } from "react";
import type { TaskBoardActions, TaskBoardState } from "../../_hooks/useTaskBoard";
import type { TaskBoardGroup } from "../../_types/board.types";
import { computeSubNameColWidth, mainMinWidth, subMinWidth } from "../../_lib/layout_utils";
import { applySort } from "../../_lib/sort_utils";
import ItemRow from "../rows/ItemRow";
import SubitemHeaderRow from "../rows/SubitemHeaderRow";
import SubitemRow from "../rows/SubitemRow";
import AddSubitemRow from "../rows/AddSubitemRow";
import GroupSummaryRow from "../rows/GroupSummaryRow";
import TreeBar from "../rows/TreeBar";
import GroupHeaderBar from "./GroupHeaderBar";
import GroupColumnHeaderRow from "./GroupColumnHeaderRow";

interface GroupSectionProps {
  group: TaskBoardGroup;
  group_index: number;
  group_count: number;
  name_col_width: number;
  state: TaskBoardState;
  actions: TaskBoardActions;
}

export default function GroupSection({ group, group_index, group_count, name_col_width, state, actions }: GroupSectionProps) {
  const is_collapsed = !!state.collapsed_groups[group.key];
  const min_width = mainMinWidth(name_col_width, group.base_columns, group.custom_columns);
  const sorted_items = applySort(group.items, state.sort, `main:${group.key}`, group.base_columns.concat(group.custom_columns));

  return (
    <div style={{ marginTop: group_index === 0 ? 0 : is_collapsed ? 10 : 30 }}>
      <GroupHeaderBar group={group} group_index={group_index} group_count={group_count} min_width={min_width} state={state} actions={actions} />

      {!is_collapsed && (
        <div>
          <GroupColumnHeaderRow group={group} name_col_width={name_col_width} min_width={min_width} state={state} actions={actions} />

          {sorted_items.map((item) => {
            const is_open = !!state.open_map[item.id];
            const sub_name_col_width = computeSubNameColWidth(item.subs.map((s) => s.name));
            const sub_min_width = subMinWidth(min_width, sub_name_col_width, group.sub_base_columns, group.sub_custom_columns);
            const sorted_subs = applySort(item.subs, state.sort, `sub:${item.id}`, group.sub_base_columns.concat(group.sub_custom_columns));

            return (
              <Fragment key={item.id}>
                <ItemRow item={item} group={group} name_col_width={name_col_width} min_width={min_width} state={state} actions={actions} />

                {is_open && item.subs.length > 0 && (
                  <>
                    <SubitemHeaderRow item={item} group={group} name_col_width={sub_name_col_width} min_width={sub_min_width} state={state} actions={actions} />
                    {sorted_subs.map((sub) => (
                      <SubitemRow key={sub.id} sub={sub} item={item} group={group} name_col_width={sub_name_col_width} min_width={sub_min_width} state={state} actions={actions} />
                    ))}
                    <AddSubitemRow min_width={sub_min_width} color={group.color} tint={group.tint} onAdd={() => actions.addSubitem(item.id)} />
                    <div className="flex items-stretch" style={{ minWidth: sub_min_width, height: 16 }}>
                      <TreeBar variant="gap" color={group.color} tint={group.tint} />
                    </div>
                  </>
                )}
              </Fragment>
            );
          })}

          <GroupSummaryRow group={group} name_col_width={name_col_width} min_width={min_width} state={state} />
        </div>
      )}
    </div>
  );
}
