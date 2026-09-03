"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import { mainGridTemplate } from "../layoutUtils";
import ColumnPicker from "../menus/ColumnPicker";
import ColumnHeaderCell from "./ColumnHeaderCell";

interface GroupColumnHeaderRowProps {
  group: BoardTableGroup;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
}

export default function GroupColumnHeaderRow({ group, name_col_width, min_width, state, actions }: GroupColumnHeaderRowProps) {
  const scope_key_of = (column_id: string) => `main|${group.key}|${column_id}`;
  const sort_scope = `main:${group.key}`;
  const main_tpl = mainGridTemplate(name_col_width, group.base_columns, group.custom_columns);
  const picker_key = `pick:main|${group.key}`;
  const custom_ids = new Set(group.custom_columns.map((c) => c.id));

  return (
    <div className="top-10 z-[70] flex items-stretch rounded-t-[8px] bg-white " style={{ minWidth: min_width }}>
      <div className="w-[5px] flex-none rounded-tl-[3px]" style={{ background: group.color }} />

      <div className="flex-1 border-b border-[#e3e6ef]" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="h-[38px] border-r border-[#eceef5]" />

        <ColumnHeaderCell
          scoped_key="item-title"
          title={group.item_title}
          height={38}
          can_delete={false}
          sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === "__name" ? state.sort.direction : null}
          is_menu_open={state.open_column_menu_key === "item-title:" + group.key}
          is_hovered={state.hover_head_key === "item-title:" + group.key}
          onEnter={() => actions.setHoverHead("item-title:" + group.key)}
          onLeave={() => actions.setHoverHead(null)}
          onOpenMenu={() => actions.openColumnMenu("item-title:" + group.key)}
          onCloseMenu={actions.closeColumnMenu}
          onRename={(title) => actions.renameItemTitle(group.key, "main", title)}
          onSort={(dir) => actions.setSort(sort_scope, "__name", dir)}
          onDuplicate={() => { }}
          onDelete={() => { }}
        />

        <div className="h-[38px] border-r border-[#eceef5]" />

        {group.base_columns.concat(group.custom_columns).map((col) => (
          <ColumnHeaderCell
            key={col.id}
            scoped_key={scope_key_of(col.id)}
            title={col.title}
            height={38}
            can_delete={custom_ids.has(col.id)}
            sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === col.id ? state.sort.direction : null}
            is_menu_open={state.open_column_menu_key === scope_key_of(col.id)}
            is_hovered={state.hover_head_key === scope_key_of(col.id)}
            onEnter={() => actions.setHoverHead(scope_key_of(col.id))}
            onLeave={() => actions.setHoverHead(null)}
            onOpenMenu={() => actions.openColumnMenu(scope_key_of(col.id))}
            onCloseMenu={actions.closeColumnMenu}
            onRename={(title) => actions.renameColumn(group.key, "main", col.id, title)}
            onSort={(dir) => actions.setSort(sort_scope, col.id, dir)}
            onDuplicate={() => actions.duplicateColumn(group.key, "main", col.id)}
            onDelete={() => actions.deleteColumn(group.key, "main", col.id)}
          />
        ))}

        <div className="relative flex h-[38px] items-center justify-center">
          <button type="button" onClick={() => actions.openPicker(picker_key)} className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-[#6b7189] hover:bg-[#eef1f9] hover:text-[#4f6bed]">
            <svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          {state.open_picker_key === picker_key && (
            <ColumnPicker
              query={state.picker_query}
              onQueryChange={actions.setPickerQuery}
              onPick={(type) => actions.addColumn(group.key, "main", type.kind, type.label, type.default_width)}
              onClose={actions.closePicker}
            />
          )}
        </div>
        <div className="h-[38px]" />
      </div>
    </div>
  );
}
