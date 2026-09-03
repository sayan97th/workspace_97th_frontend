"use client";

import { useCallback, useMemo } from "react";
import { useBoardTable, type UseBoardTableConfig } from "./useBoardTable";
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
}

/** The "Main table" board view: a Monday-style grid of groups, tree rows and subitems with rich per-column cell editing. Mirrors `BoardKanban`'s role as the generic shell for its own view kind. */
export default function BoardTable({ board_title = "Main table", embedded = false, config, onCreateItem, onCreateSubitem, onCreateGroup }: BoardTableProps) {
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

  const actions = useMemo(
    () => ({ ...base_actions, addItem: addItemReal, addSubitem: addSubitemReal, addGroup: addGroupReal }),
    [base_actions, addItemReal, addSubitemReal, addGroupReal]
  );

  const name_col_width = useMemo(() => {
    const all_names = state.groups.flatMap((g) => g.items.map((it) => it.name));
    return computeNameColWidth(all_names);
  }, [state.groups]);

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
        />
      ))}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); actions.addGroup(); }}
        className="mt-4 flex items-center gap-2 rounded-[6px] px-2 py-2 text-[13.5px] font-medium text-boardtree-text-muted hover:bg-[#eef1f9] hover:text-boardtree-accent"
      >
        <svg viewBox="0 0 14 14" width="13" height="13"><path d="M7 2.6 V11.4 M2.6 7 H11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Add new group
      </button>
    </>
  );

  const modals = (
    <>
      {state.label_editor_kind === "status" && (
        <LabelEditorModal
          title="Edit status labels"
          defs={state.status_defs}
          onRename={actions.renameStatusDef}
          onColor={actions.setStatusDefColor}
          onDelete={actions.deleteStatusDef}
          onAdd={actions.addStatusDef}
          onClose={actions.closeLabelEditor}
        />
      )}
      {state.label_editor_kind === "label" && (
        <LabelEditorModal
          title="Edit labels"
          defs={state.label_defs}
          onRename={actions.renameLabelDef}
          onColor={actions.setLabelDefColor}
          onDelete={actions.deleteLabelDef}
          onAdd={actions.addLabelDef}
          onClose={actions.closeLabelEditor}
        />
      )}
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
