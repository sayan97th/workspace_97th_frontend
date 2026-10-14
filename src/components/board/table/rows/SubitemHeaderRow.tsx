"use client";

import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup, BoardTableItem, ColumnAutomationShortcut } from "../types";
import { subGridTemplate, subStickyOffsets } from "../layoutUtils";
import ColumnHeaderCell from "../group/ColumnHeaderCell";
import ColumnPicker from "../menus/ColumnPicker";
import TreeBar from "./TreeBar";
import { statusColumnsOf } from "../progressTracking";

interface SubitemHeaderRowProps {
  item: BoardTableItem;
  group: BoardTableGroup;
  name_col_width: number;
  min_width: number;
  state: BoardTableState;
  actions: BoardTableActions;
  onRequestColumnFilter?: (column_id: string) => void;
  /** Opens the column permissions dialog for a column, only passed for board owners. */
  onRequestColumnPermissions?: (column_id: string) => void;
  /** "Automate" in each column's header menu. */
  column_automation?: ColumnAutomationShortcut;
  onRequestGroupByColumn?: (column_id: string) => void;
}

export default function SubitemHeaderRow({ item, group, name_col_width, min_width, state, actions, onRequestColumnFilter, onRequestGroupByColumn, onRequestColumnPermissions, column_automation }: SubitemHeaderRowProps) {
  const scope_key_of = (column_id: string) => `sub|${item.id}|${column_id}`;
  const sub_title_key = `sub-title:${item.id}`;
  const sort_scope = `sub:${item.id}`;
  const sub_tpl = subGridTemplate(name_col_width, group.sub_base_columns, group.sub_custom_columns);
  const picker_key = `pick:sub|${item.id}`;
  const sticky_offsets = subStickyOffsets(name_col_width);
  const HEADER_BG = "var(--color-boardtree-panel-alt)";
  const progress_status_columns = statusColumnsOf(group.sub_base_columns.concat(group.sub_custom_columns)).map(({ id, title }) => ({ id, title }));

  return (
    <div className="flex items-stretch" style={{ minWidth: min_width }}>
      <TreeBar variant="thin" color={group.color} />
      <div className="w-[30px] flex-none" />
      <div className="w-[5px] flex-none rounded-tl-[5px]" style={{ background: group.color, marginTop: 8 }} />
      <div className="mt-2 flex-1 rounded-tr-[10px] border border-l-0 border-b border-boardtree-border bg-boardtree-panel-alt" style={{ display: "grid", gridTemplateColumns: sub_tpl }}>
        <div className="h-9 border-r border-boardtree-grid" style={{ position: "sticky", left: sticky_offsets[0], zIndex: 16, background: HEADER_BG }} />

        <ColumnHeaderCell
          scoped_key={sub_title_key}
          title={group.sub_title}
          height={36}
          can_delete={false}
          sticky={{ left: sticky_offsets[1], background: HEADER_BG }}
          sort_dir={state.sort?.scope_key === sort_scope && state.sort.column_id === "__name" ? state.sort.direction : null}
          is_menu_open={state.open_column_menu_key === sub_title_key}
          is_hovered={state.hover_head_key === sub_title_key}
          is_editing={state.editing_column?.scoped_key === sub_title_key}
          draft={state.column_draft}
          onEnter={() => actions.setHoverHead(sub_title_key)}
          onLeave={() => actions.setHoverHead(null)}
          onOpenMenu={() => actions.openColumnMenu(sub_title_key)}
          onCloseMenu={actions.closeColumnMenu}
          onStartRename={() => actions.startColumnRename(sub_title_key, group.key, "sub", null, group.sub_title)}
          onDraftChange={actions.updateColumnDraft}
          onCommitRename={actions.commitColumnRename}
          onCancelRename={actions.cancelColumnRename}
          onSort={(dir) => actions.setSort(sort_scope, "__name", dir)}
          onCollapseAll={actions.collapseAllGroups}
          onDuplicate={() => {}}
          onDelete={() => {}}
          resizable_width={name_col_width}
          onResizePreview={(width) => actions.resizeSubColumnPreview(width)}
          onResizeEnd={(width) => actions.commitSubColumnResize(width)}
          className="col-span-2"
        />

        {group.sub_base_columns.concat(group.sub_custom_columns).map((col) => (
          <ColumnHeaderCell
            key={col.id}
            scoped_key={scope_key_of(col.id)}
            title={col.title}
            height={36}
            column={{ id: col.id, kind: col.kind, width: col.width, options: col.options, validation: col.validation, reminder: col.reminder, button: col.button, dependency: col.dependency, dependency_date_columns: col.dependency_date_columns, description: col.description, linkage: col.linkage, hide_summary: col.hide_summary, rating_max: col.rating_max, rating_icon: col.rating_icon, progress_columns: col.progress_columns, progress_status_columns: col.kind === "progress_tracking" ? progress_status_columns : undefined }}
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
            onStartRename={() => actions.startColumnRename(scope_key_of(col.id), group.key, "sub", col.id, col.title)}
            onDraftChange={actions.updateColumnDraft}
            onCommitRename={actions.commitColumnRename}
            onCancelRename={actions.cancelColumnRename}
            onSort={(dir) => actions.setSort(sort_scope, col.id, dir)}
            onUpdateSettings={(patch) => actions.updateColumnSettings(group.key, "sub", col.id, patch)}
            onResizePreview={(width) => actions.resizeColumnPreview(group.key, "sub", col.id, width)}
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
            onEditFormula={col.kind === "formula" ? () => actions.openConfigEditor("formula", col.id) : undefined}
            onEditMirror={col.kind === "mirror" ? () => actions.openConfigEditor("mirror", col.id) : undefined}
            onEditConnectBoard={col.kind === "connect_board" ? () => actions.openConfigEditor("connect_board", col.id) : undefined}
            onRequestFilter={() => onRequestColumnFilter?.(col.id)}
            onRequestGroupBy={() => onRequestGroupByColumn?.(col.id)}
            onRequestPermissions={onRequestColumnPermissions ? () => onRequestColumnPermissions(col.id) : undefined}
            automation={column_automation ? { count: column_automation.counts[col.id] ?? 0, onOpen: () => column_automation.onOpen(col.id) } : undefined}
            is_restricted={col.is_restricted}
            onCollapseAll={actions.collapseAllGroups}
            onDuplicate={(with_values) => actions.duplicateColumn(group.key, "sub", col.id, with_values)}
            onAddColumnRight={(kind, label, width) => actions.addColumn(group.key, "sub", kind, label, width, col.id)}
            onChangeType={(kind, width) => actions.changeColumnKind(group.key, "sub", col.id, kind, width)}
            onDelete={() => actions.deleteColumn(group.key, "sub", col.id)}
            is_draggable
            is_dragging={state.column_drag?.column_id === col.id}
            onColumnDragStart={() => actions.onColumnDragStart(group.key, "sub", col.id)}
            onColumnDragOver={() => actions.onColumnDragOver(col.id)}
            onColumnDragEnd={actions.onColumnDragEnd}
          />
        ))}

        <div className="relative flex h-9 items-center justify-center">
          {/* Marked as part of the gallery, so a click on it toggles the open gallery closed instead of closing and reopening it. */}
          <button
            type="button"
            data-board-menu-flyout
            aria-label={state.open_picker_key === picker_key ? "Close column types" : "Add column"}
            aria-expanded={state.open_picker_key === picker_key}
            onClick={() => actions.openPicker(picker_key)}
            hidden={!state.can_edit_structure || state.read_only}
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-[5px] hover:bg-boardtree-hover hover:text-boardtree-accent ${
              state.open_picker_key === picker_key ? "bg-boardtree-accent-surface text-boardtree-accent" : "text-boardtree-text-muted"
            }`}
          >
            <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" className={`transition-transform duration-150 ${state.open_picker_key === picker_key ? "rotate-45" : ""}`}>
              <path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
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
