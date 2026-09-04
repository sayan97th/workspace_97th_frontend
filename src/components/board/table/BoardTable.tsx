"use client";

import { useCallback, useMemo } from "react";
import { useBoardTable, type ColumnScope, type UseBoardTableConfig } from "./useBoardTable";
import type { ColumnDef, ColumnKind } from "./types";
import { STATUS_PALETTE } from "./constants";
import { computeNameColWidth } from "./layoutUtils";
import { boardTreeFontClassName } from "../board-tree-font";
import TableHeader from "./toolbar/TableHeader";
import TableToolbar from "./toolbar/TableToolbar";
import GroupSection from "./group/GroupSection";
import LabelEditorModal from "./menus/LabelEditorModal";
import TagManagerModal from "./menus/TagManagerModal";
import "./table-board.css";

export interface BoardTableProps {
  board_title?: string;
  /**
   * Renders just the group/row grid, with no `TableHeader`/`TableToolbar` of
   * its own and no full-page height/scroll wrapper — for use as a real
   * board's "Main table" tab body, nested inside `BoardShell` (which already
   * supplies the real header, tabs and toolbar, and owns the page's one
   * scroll container). Defaults to false, rendering the full standalone demo
   * shell instead.
   */
  embedded?: boolean;
  /** Bridges to real, API-backed data — see `UseBoardTableConfig`'s own doc comment. Omitted, BoardTable renders the standalone mock demo. */
  config?: UseBoardTableConfig;
  /**
   * Creating a row is a two-step handshake with a real board: the caller
   * persists it first and resolves with its real id, and only then does
   * `BoardTable` add it locally under that id — so every subsequent action
   * on the row (rename, cell edits) is already addressable against the real
   * backend, with no local-id-to-real-id reconciliation step. Omitted,
   * creation stays local-only (the standalone demo behavior).
   */
  onCreateItem?: (group_key: string) => Promise<string>;
  onCreateSubitem?: (item_id: string) => Promise<string>;
  onCreateGroup?: () => Promise<{ key: string; title: string }>;
  /**
   * Persists a column picked from the "+" gallery (`ColumnPicker`, main-table
   * or subitem header). Once the caller's real create call resolves and its
   * own column list updates, the new column reaches `BoardTable` again as
   * part of `config.initial_groups` (`base_columns`) — `useBoardTable`'s
   * resync effect picks it up automatically, so no local-id handshake is
   * needed here (unlike `onCreateItem`/`onCreateSubitem`/`onCreateGroup`).
   * Omitted, `addColumn` stays local-only (the standalone demo behavior,
   * adding into `custom_columns` instead).
   */
  onAddColumn?: (group_key: string, scope: ColumnScope, kind: ColumnKind, label: string, default_width: number) => Promise<void>;
  /**
   * Column-header menu — "Duplicate column"/"Add column to the right" both
   * create a *new* column id, so they follow this same handshake (skip local
   * mutation, let the resync effect off `config.initial_groups` bring the new
   * column in once the caller's own list re-renders) rather than the
   * config-callback-inside-hook pattern `onRenameColumn`/`onDeleteColumn`/
   * `onUpdateColumnSettings`/`onChangeColumnKind` use (see `UseBoardTableConfig`).
   */
  onDuplicateColumn?: (group_key: string, scope: ColumnScope, column_id: string) => Promise<void>;
  onAddColumnRight?: (
    group_key: string,
    scope: ColumnScope,
    after_column_id: string,
    kind: ColumnKind,
    label: string,
    default_width: number
  ) => Promise<void>;
  /** Column menu's "Filter"/"Group by" rows — bridges to the board's toolbar (a sibling of `BoardTable`, not a descendant), which owns Filter/Sort/GroupBy state. Omitted, those rows still render but are no-ops. */
  onRequestColumnFilter?: (column_id: string) => void;
  onRequestGroupByColumn?: (column_id: string) => void;
}

/** The "Main table" board view: a Monday-style grid of groups, tree rows and subitems with rich per-column cell editing. Mirrors `BoardKanban`'s role as the generic shell for its own view kind. */
export default function BoardTable({
  board_title = "Main table",
  embedded = false,
  config,
  onCreateItem,
  onCreateSubitem,
  onCreateGroup,
  onAddColumn,
  onDuplicateColumn,
  onAddColumnRight,
  onRequestColumnFilter,
  onRequestGroupByColumn,
}: BoardTableProps) {
  const { state, actions: base_actions, summary_text } = useBoardTable(config);

  const addItemReal = useCallback(
    (group_key: string) => {
      if (!onCreateItem) return base_actions.addItem(group_key);
      void onCreateItem(group_key).then((real_id) => base_actions.addItem(group_key, real_id));
      return "";
    },
    [onCreateItem, base_actions]
  );

  const addSubitemReal = useCallback(
    (item_id: string) => {
      if (!onCreateSubitem) return base_actions.addSubitem(item_id);
      void onCreateSubitem(item_id).then((real_id) => base_actions.addSubitem(item_id, real_id));
      return "";
    },
    [onCreateSubitem, base_actions]
  );

  const addGroupReal = useCallback(() => {
    if (!onCreateGroup) return base_actions.addGroup();
    void onCreateGroup().then(({ key, title }) => base_actions.addGroup(key, title));
    return "";
  }, [onCreateGroup, base_actions]);

  const addColumnReal = useCallback(
    (group_key: string, scope: ColumnScope, kind: ColumnKind, label: string, default_width: number, after_column_id?: string) => {
      if (after_column_id) {
        if (!onAddColumnRight) return base_actions.addColumn(group_key, scope, kind, label, default_width, after_column_id);
        void onAddColumnRight(group_key, scope, after_column_id, kind, label, default_width);
        return;
      }
      if (!onAddColumn) return base_actions.addColumn(group_key, scope, kind, label, default_width);
      void onAddColumn(group_key, scope, kind, label, default_width);
    },
    [onAddColumn, onAddColumnRight, base_actions]
  );

  const duplicateColumnReal = useCallback(
    (group_key: string, scope: ColumnScope, column_id: string) => {
      if (!onDuplicateColumn) return base_actions.duplicateColumn(group_key, scope, column_id);
      void onDuplicateColumn(group_key, scope, column_id);
    },
    [onDuplicateColumn, base_actions]
  );

  const actions = useMemo(
    () => ({
      ...base_actions,
      addItem: addItemReal,
      addSubitem: addSubitemReal,
      addGroup: addGroupReal,
      addColumn: addColumnReal,
      duplicateColumn: duplicateColumnReal,
    }),
    [base_actions, addItemReal, addSubitemReal, addGroupReal, addColumnReal, duplicateColumnReal]
  );

  const name_col_width = useMemo(() => {
    const all_names = state.groups.flatMap((g) => g.items.map((it) => it.name));
    return computeNameColWidth(all_names);
  }, [state.groups]);

  /**
   * The real column the status/label editor is currently open for (see
   * `CellRenderer`'s `openLabelEditor(kind, column.id)` call) — found across
   * every group's four column lists since a column definition is the same
   * logical entity everywhere it's rendered. `options !== undefined` marks a
   * real, API-backed column (own persisted option set); a mock-demo column
   * never sets it, so the editor below falls back to the shared palette.
   */
  const label_editor_column: ColumnDef | undefined = useMemo(() => {
    const column_id = state.label_editor_column_id;
    if (!column_id) return undefined;
    for (const g of state.groups) {
      for (const list of [g.base_columns, g.custom_columns, g.sub_base_columns, g.sub_custom_columns]) {
        const found = list.find((c) => c.id === column_id);
        if (found) return found;
      }
    }
    return undefined;
  }, [state.groups, state.label_editor_column_id]);
  const is_real_label_editor_column = label_editor_column?.options !== undefined;

  const grid = (
    <>
      {!embedded && <div className="h-[26px]" />}
      {state.groups.map((group, index) => (
        <GroupSection
          key={group.key}
          group={group}
          group_index={index}
          group_count={state.groups.length}
          name_col_width={name_col_width}
          state={state}
          actions={actions}
          onRequestColumnFilter={onRequestColumnFilter}
          onRequestGroupByColumn={onRequestGroupByColumn}
        />
      ))}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); actions.addGroup(); }}
        className="mt-4 flex items-center gap-2 rounded-[6px] px-2 py-2 text-[13.5px] font-medium text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-accent"
      >
        <svg viewBox="0 0 14 14" width="13" height="13"><path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Add new group
      </button>
    </>
  );

  const modals = (
    <>
      {state.label_editor_kind === "status" && (is_real_label_editor_column ? (
        <LabelEditorModal
          title="Edit status labels"
          defs={label_editor_column!.options!}
          onRename={(id, label) => actions.renameColumnOption(label_editor_column!.id, id, label)}
          onColor={(id, color) => actions.recolorColumnOption(label_editor_column!.id, id, color)}
          onDelete={(id) => actions.deleteColumnOption(label_editor_column!.id, id)}
          onAdd={() =>
            actions.addColumnOption(label_editor_column!.id, {
              label: "New status",
              color: STATUS_PALETTE[label_editor_column!.options!.length % STATUS_PALETTE.length],
            })
          }
          onClose={actions.closeLabelEditor}
        />
      ) : (
        <LabelEditorModal
          title="Edit status labels"
          defs={state.status_defs}
          onRename={actions.renameStatusDef}
          onColor={actions.setStatusDefColor}
          onDelete={actions.deleteStatusDef}
          onAdd={actions.addStatusDef}
          onClose={actions.closeLabelEditor}
        />
      ))}
      {state.label_editor_kind === "label" && (is_real_label_editor_column ? (
        <LabelEditorModal
          title="Edit labels"
          defs={label_editor_column!.options!}
          onRename={(id, label) => actions.renameColumnOption(label_editor_column!.id, id, label)}
          onColor={(id, color) => actions.recolorColumnOption(label_editor_column!.id, id, color)}
          onDelete={(id) => actions.deleteColumnOption(label_editor_column!.id, id)}
          onAdd={() =>
            actions.addColumnOption(label_editor_column!.id, {
              label: "New label",
              color: STATUS_PALETTE[label_editor_column!.options!.length % STATUS_PALETTE.length],
            })
          }
          onClose={actions.closeLabelEditor}
        />
      ) : (
        <LabelEditorModal
          title="Edit labels"
          defs={state.label_defs}
          onRename={actions.renameLabelDef}
          onColor={actions.setLabelDefColor}
          onDelete={actions.deleteLabelDef}
          onAdd={actions.addLabelDef}
          onClose={actions.closeLabelEditor}
        />
      ))}
      {state.tag_editor_open && (
        <TagManagerModal
          tag_defs={state.tag_defs}
          onColor={actions.setTagDefColor}
          onDelete={actions.deleteTagDef}
          onAdd={actions.addTagDef}
          onClose={actions.closeTagEditor}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div className={boardTreeFontClassName}>
        {grid}
        {modals}
      </div>
    );
  }

  return (
    <div className={`table-board-root flex h-screen flex-col overflow-hidden bg-boardtree-bg text-boardtree-text ${boardTreeFontClassName}`}>
      <TableHeader board_title={board_title} />
      <TableToolbar summary_text={summary_text} onNewItem={() => state.groups[0] && actions.addItem(state.groups[0].key)} />

      <div className="min-h-0 flex-1">
        <div className="table-board-scroll h-full overflow-auto px-7 pb-[60px]">{grid}</div>
      </div>

      {modals}
    </div>
  );
}
