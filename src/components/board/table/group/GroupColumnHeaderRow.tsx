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
  onRequestColumnFilter?: (column_id: string) => void;
  onRequestGroupByColumn?: (column_id: string) => void;
}

export default function GroupColumnHeaderRow({ group, name_col_width, min_width, state, actions, onRequestColumnFilter, onRequestGroupByColumn }: GroupColumnHeaderRowProps) {
  const scope_key_of = (column_id: string) => `main|${group.key}|${column_id}`;
  const item_title_key = `item-title:${group.key}`;
  const sort_scope = `main:${group.key}`;
  const main_tpl = mainGridTemplate(name_col_width, group.base_columns, group.custom_columns);
  const picker_key = `pick:main|${group.key}`;

  return (
    <div className="top-10 z-[70] flex items-stretch rounded-t-[8px] bg-boardtree-surface " style={{ minWidth: min_width }}>
      <div className="w-[5px] flex-none rounded-tl-[3px]" style={{ background: group.color }} />

      <div className="flex-1 border-b border-boardtree-border" style={{ display: "grid", gridTemplateColumns: main_tpl }}>
        <div className="h-[38px] border-r border-boardtree-border-soft" />

        <ColumnHeaderCell
          scoped_key={item_title_key}
          title={group.item_title}
          height={38}
          can_delete={false}
          sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === "__name" ? state.sort.direction : null}
          is_menu_open={state.open_column_menu_key === item_title_key}
          is_hovered={state.hover_head_key === item_title_key}
          is_editing={state.editing_column?.scoped_key === item_title_key}
          draft={state.column_draft}
          onEnter={() => actions.setHoverHead(item_title_key)}
          onLeave={() => actions.setHoverHead(null)}
          onOpenMenu={() => actions.openColumnMenu(item_title_key)}
          onCloseMenu={actions.closeColumnMenu}
          onRename={(title) => actions.renameItemTitle(group.key, "main", title)}
          onStartRename={() => actions.startColumnRename(item_title_key, group.key, "main", null, group.item_title)}
          onDraftChange={actions.updateColumnDraft}
          onCommitRename={actions.commitColumnRename}
          onCancelRename={actions.cancelColumnRename}
          onSort={(dir) => actions.setSort(sort_scope, "__name", dir)}
          onCollapseAll={actions.collapseAllGroups}
          onDuplicate={() => { }}
          onDelete={() => { }}
        />

        <div className="h-[38px] border-r border-boardtree-border-soft" />

        {group.base_columns.concat(group.custom_columns).map((col) => (
          <ColumnHeaderCell
            key={col.id}
            scoped_key={scope_key_of(col.id)}
            title={col.title}
            height={38}
            column={{ id: col.id, kind: col.kind, width: col.width, options: col.options }}
            can_delete={true}
            is_group_by_eligible={(col.kind === "status" || col.kind === "label") && !!col.options?.length}
            sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === col.id ? state.sort.direction : null}
            is_menu_open={state.open_column_menu_key === scope_key_of(col.id)}
            is_hovered={state.hover_head_key === scope_key_of(col.id)}
            is_editing={state.editing_column?.scoped_key === scope_key_of(col.id)}
            draft={state.column_draft}
            onEnter={() => actions.setHoverHead(scope_key_of(col.id))}
            onLeave={() => actions.setHoverHead(null)}
            onOpenMenu={() => actions.openColumnMenu(scope_key_of(col.id))}
            onCloseMenu={actions.closeColumnMenu}
            onRename={(title) => actions.renameColumn(group.key, "main", col.id, title)}
            onStartRename={() => actions.startColumnRename(scope_key_of(col.id), group.key, "main", col.id, col.title)}
            onDraftChange={actions.updateColumnDraft}
            onCommitRename={actions.commitColumnRename}
            onCancelRename={actions.cancelColumnRename}
            onSort={(dir) => actions.setSort(sort_scope, col.id, dir)}
            onUpdateSettings={(patch) => actions.updateColumnSettings(group.key, "main", col.id, patch)}
            onResizePreview={(width) => actions.resizeColumnPreview(group.key, "main", col.id, width)}
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
            onDuplicate={() => actions.duplicateColumn(group.key, "main", col.id)}
            onAddColumnRight={(kind, label, width) => actions.addColumn(group.key, "main", kind, label, width, col.id)}
            onChangeType={(kind, width) => actions.changeColumnKind(group.key, "main", col.id, kind, width)}
            onDelete={() => actions.deleteColumn(group.key, "main", col.id)}
          />
        ))}

        <div className="relative flex h-[38px] items-center justify-center">
          <button type="button" onClick={() => actions.openPicker(picker_key)} className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-accent">
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
