"use client";
import React from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, Columns3, Rows3, TableProperties, Trash2 } from "lucide-react";
import { useDocEditor } from "../DocEditorContext";

/** The table around the caret, for anchoring the menu above it. */
const findTableElement = (dom_node: Node | null): HTMLElement | null => {
  const element = dom_node instanceof HTMLElement ? dom_node : dom_node?.parentElement ?? null;
  return element?.closest("table") ?? null;
};

/** Row and column actions floating above the table the caret is in. */
const TableBubbleMenu: React.FC = () => {
  const { editor, editable } = useDocEditor();
  if (!editor || !editable) return null;

  const actions = [
    { key: "row-above", label: "Add row above", icon: <ArrowUpToLine size={15} />, run: () => editor.chain().focus().addRowBefore().run() },
    { key: "row-below", label: "Add row below", icon: <ArrowDownToLine size={15} />, run: () => editor.chain().focus().addRowAfter().run() },
    { key: "col-left", label: "Add column left", icon: <ArrowLeftToLine size={15} />, run: () => editor.chain().focus().addColumnBefore().run() },
    { key: "col-right", label: "Add column right", icon: <ArrowRightToLine size={15} />, run: () => editor.chain().focus().addColumnAfter().run() },
    { key: "header", label: "Toggle header row", icon: <TableProperties size={15} />, run: () => editor.chain().focus().toggleHeaderRow().run() },
    { key: "delete-row", label: "Delete row", icon: <Rows3 size={15} />, run: () => editor.chain().focus().deleteRow().run(), divided: true },
    { key: "delete-col", label: "Delete column", icon: <Columns3 size={15} />, run: () => editor.chain().focus().deleteColumn().run() },
    { key: "delete-table", label: "Delete table", icon: <Trash2 size={15} />, run: () => editor.chain().focus().deleteTable().run() },
  ];

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="docTableBubble"
      options={{ placement: "top-start", offset: 8, flip: false, shift: { padding: 8 } }}
      shouldShow={({ editor: current, state }) => current.isEditable && current.isActive("table") && state.selection.empty}
      getReferencedVirtualElement={() => {
        const table = findTableElement(editor.view.domAtPos(editor.state.selection.from).node);
        if (!table) return null;
        return { getBoundingClientRect: () => table.getBoundingClientRect(), getClientRects: () => table.getClientRects() };
      }}
      className="doc-theme doc-bubble"
    >
      <div className="doc-bubble-row">
        {actions.map((action) => (
          <React.Fragment key={action.key}>
            {action.divided && <span className="doc-bubble-divider" />}
            <button
              type="button"
              aria-label={action.label}
              title={action.label}
              className="doc-bubble-button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={action.run}
            >
              {action.icon}
            </button>
          </React.Fragment>
        ))}
      </div>
    </BubbleMenu>
  );
};

export default TableBubbleMenu;
