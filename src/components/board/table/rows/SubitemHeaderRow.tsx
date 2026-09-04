"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup, BoardTableItem } from "../types";
import { subGridTemplate } from "../layoutUtils";
import ColumnHeaderCell from "../group/ColumnHeaderCell";
import ColumnPicker from "../menus/ColumnPicker";
import TreeBar from "./TreeBar";

interface SubitemHeaderRowProps {
  item: BoardTableItem;
  group: BoardTableGroup;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
  onRequestColumnFilter?: (column_id: string) => void;
  onRequestGroupByColumn?: (column_id: string) => void;
}

export default function SubitemHeaderRow({ item, group, name_col_width, min_width, state, actions, onRequestColumnFilter, onRequestGroupByColumn }: SubitemHeaderRowProps) {
  const scope_key_of = (column_id: string) => `sub|${item.id}|${column_id}`;
  const sort_scope = `sub:${item.id}`;
  const sub_tpl = subGridTemplate(name_col_width, group.sub_base_columns, group.sub_custom_columns);
  const picker_key = `pick:sub|${item.id}`;

  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <TreeBar variant="thin" color={group.color} />
      <div className="w-[30px] flex-none" />
      <div className="w-[5px] flex-none rounded-tl-[5px]" style={{ background: group.color, marginTop: 8 }} />
      <div className="mt-2 flex-1 rounded-tr-[10px] border border-l-0 border-b border-boardtree-border bg-boardtree-panel-alt" style={{ display: "grid", gridTemplateColumns: sub_tpl }}>
        <div className="h-9 border-r border-boardtree-border-soft" />

        <ColumnHeaderCell
          scoped_key="sub-title"
          title={group.sub_title}
          height={36}
          can_delete={false}
          sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === "__name" ? state.sort.direction : null}
          is_menu_open={state.open_column_menu_key === "sub-title:" + item.id}
          is_hovered={state.hover_head_key === "sub-title:" + item.id}
          onEnter={() => actions.setHoverHead("sub-title:" + item.id)}
          onLeave={() => actions.setHoverHead(null)}
          onOpenMenu={() => actions.openColumnMenu("sub-title:" + item.id)}
          onCloseMenu={actions.closeColumnMenu}
          onRename={(title) => actions.renameItemTitle(group.key, "sub", title)}
          onSort={(dir) => actions.setSort(sort_scope, "__name", dir)}
          onCollapseAll={actions.collapseAllGroups}
          onDuplicate={() => {}}
          onDelete={() => {}}
        />

        <div className="h-9 border-r border-boardtree-border-soft" />

        {group.sub_base_columns.concat(group.sub_custom_columns).map((col) => (
          <ColumnHeaderCell
            key={col.id}
            scoped_key={scope_key_of(col.id)}
            title={col.title}
            height={36}
            column={{ id: col.id, kind: col.kind, width: col.width, options: col.options }}
            can_delete={true}
            is_group_by_eligible={(col.kind === "status" || col.kind === "label") && !!col.options?.length}
            sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === col.id ? state.sort.direction : null}
            is_menu_open={state.open_column_menu_key === scope_key_of(col.id)}
            is_hovered={state.hover_head_key === scope_key_of(col.id)}
            onEnter={() => actions.setHoverHead(scope_key_of(col.id))}
            onLeave={() => actions.setHoverHead(null)}
            onOpenMenu={() => actions.openColumnMenu(scope_key_of(col.id))}
            onCloseMenu={actions.closeColumnMenu}
            onRename={(title) => actions.renameColumn(group.key, "sub", col.id, title)}
            onSort={(dir) => actions.setSort(sort_scope, col.id, dir)}
            onUpdateSettings={(patch) => actions.updateColumnSettings(group.key, "sub", col.id, patch)}
            onEditLabels={
              col.kind === "status"
                ? () => actions.openLabelEditor("status")
                : col.kind === "label"
                ? () => actions.openLabelEditor("label")
                : col.kind === "tags"
                ? () => actions.openTagEditor()
                : undefined
              // Dropdown deliberately has no header "Edit labels" entry —
              // its options are per-column (see `ColumnDef.options`), so
              // editing/deleting them happens inline in each cell's own
              // `DropdownMenu` popover instead of a shared modal.
            }
            onRequestFilter={() => onRequestColumnFilter?.(col.id)}
            onRequestGroupBy={() => onRequestGroupByColumn?.(col.id)}
            onCollapseAll={actions.collapseAllGroups}
            onDuplicate={() => actions.duplicateColumn(group.key, "sub", col.id)}
            onAddColumnRight={(kind, label, width) => actions.addColumn(group.key, "sub", kind, label, width, col.id)}
            onChangeType={(kind, width) => actions.changeColumnKind(group.key, "sub", col.id, kind, width)}
            onDelete={() => actions.deleteColumn(group.key, "sub", col.id)}
          />
        ))}

        <div className="relative flex h-9 items-center justify-center">
          <button type="button" onClick={() => actions.openPicker(picker_key)} className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-accent">
            <svg viewBox="0 0 14 14" width="14" height="14"><path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          {state.open_picker_key === picker_key && (
            <ColumnPicker
              query={state.picker_query}
              onQueryChange={actions.setPickerQuery}
              onPick={(type) => actions.addColumn(group.key, "sub", type.kind, type.label, type.default_width)}
              onClose={actions.closePicker}
            />
          )}
        </div>
        <div className="h-9" />
      </div>
    </div>
  );
}
