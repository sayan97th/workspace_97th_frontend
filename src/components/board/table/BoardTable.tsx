"use client";

import { useMemo } from "react";
import { useBoardTable } from "./useBoardTable";
import { computeNameColWidth } from "./layoutUtils";
import { boardTreeFontClassName } from "../board-tree-font";
import TableHeader from "./toolbar/TableHeader";
import TableToolbar from "./toolbar/TableToolbar";
import GroupSection from "./group/GroupSection";
import LabelEditorModal from "./menus/LabelEditorModal";
import TagManagerModal from "./menus/TagManagerModal";
import "./table-board.css";

/** The "Main table" board view: a Monday-style grid of groups, tree rows and subitems with rich per-column cell editing. Mirrors `BoardKanban`'s role as the generic shell for its own view kind. */
export default function BoardTable() {
  const { state, actions, summary_text } = useBoardTable();

  const name_col_width = useMemo(() => {
    const all_names = state.groups.flatMap((g) => g.items.map((it) => it.name));
    return computeNameColWidth(all_names);
  }, [state.groups]);

  return (
    <div className={`table-board-root flex h-screen flex-col overflow-hidden bg-boardtree-bg text-boardtree-text ${boardTreeFontClassName}`}>
      <TableHeader board_title="Q3 Delivery Board" />
      <TableToolbar summary_text={summary_text} onNewItem={() => state.groups[0] && actions.addItem(state.groups[0].key)} />

      <div className="min-h-0 flex-1">
        <div className="table-board-scroll h-full overflow-auto px-7 pb-[60px]">
          <div className="h-[26px]" />
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
        </div>
      </div>

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
    </div>
  );
}
