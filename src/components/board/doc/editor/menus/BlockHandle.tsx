"use client";
import React, { useRef, useState } from "react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { ArrowDownToLine, ArrowUpToLine, Copy, GripVertical, Plus, Repeat2, Trash2 } from "lucide-react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { TURN_INTO_BLOCKS, turnBlockInto } from "../doc-blocks";
import { useDocEditor } from "../DocEditorContext";

/** The top level block the pointer is over, and where its first line sits inside the surface. */
export type HoveredBlock = { pos: number; top: number };

type BlockHandleProps = {
  block: HoveredBlock | null;
  /** Keeps the handle on its block while its menu is open. */
  onMenuOpenChange: (is_open: boolean) => void;
};

const ICON_SIZE = 16;

/**
 * Notion style handle shown left of the block under the pointer: "+" opens
 * the "/" menu on a new line below, the grip drags the block to a new spot
 * (ProseMirror moves it on drop) or, on click, opens Turn into, Duplicate,
 * Move up/down and Delete.
 */
const BlockHandle: React.FC<BlockHandleProps> = ({ block, onMenuOpenChange }) => {
  const { editor } = useDocEditor();
  const grip_ref = useRef<HTMLButtonElement>(null);
  const [menu_pos, setMenuPos] = useState<number | null>(null);

  if (!editor || !block) return null;
  const node = editor.state.doc.nodeAt(block.pos);
  if (!node) return null;

  const closeMenu = () => {
    setMenuPos(null);
    onMenuOpenChange(false);
  };

  const handleAdd = () => {
    const is_empty_paragraph = node.type.name === "paragraph" && node.content.size === 0;
    if (is_empty_paragraph) {
      editor.chain().focus().setTextSelection(block.pos + 1).insertContent("/").run();
      return;
    }
    const after = block.pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(after, { type: "paragraph" })
      .setTextSelection(after + 1)
      .insertContent("/")
      .run();
  };

  const handleDragStart = (event: React.DragEvent) => {
    const view = editor.view;
    const selection = NodeSelection.create(view.state.doc, block.pos);
    view.dispatch(view.state.tr.setSelection(selection));
    const slice = selection.content();
    const { dom, text } = view.serializeForClipboard(slice);
    event.dataTransfer.clearData();
    event.dataTransfer.setData("text/html", dom.innerHTML);
    event.dataTransfer.setData("text/plain", text);
    event.dataTransfer.effectAllowed = "copyMove";
    const block_dom = view.nodeDOM(block.pos);
    if (block_dom instanceof HTMLElement) event.dataTransfer.setDragImage(block_dom, 0, 0);
    view.dragging = { slice, move: true };
  };

  /** Runs `action` against the block the menu was opened for, which may have moved since. */
  const withMenuBlock = (action: (pos: number) => void) => () => {
    if (menu_pos === null) return;
    action(menu_pos);
    closeMenu();
  };

  const moveBlock = (pos: number, direction: -1 | 1) => {
    const { doc } = editor.state;
    const current = doc.nodeAt(pos);
    if (!current) return;
    const index = doc.resolve(pos).index(0);
    const neighbor_index = index + direction;
    if (neighbor_index < 0 || neighbor_index >= doc.childCount) return;
    const neighbor = doc.child(neighbor_index);
    const tr = editor.state.tr.delete(pos, pos + current.nodeSize);
    const target = direction === -1 ? pos - neighbor.nodeSize : pos + neighbor.nodeSize;
    tr.insert(target, current);
    tr.setSelection(NodeSelection.create(tr.doc, target));
    editor.view.dispatch(tr.scrollIntoView());
    editor.commands.focus();
  };

  const menu_node = menu_pos !== null ? editor.state.doc.nodeAt(menu_pos) : null;
  const can_turn_into = Boolean(menu_node?.isTextblock || menu_node?.type.name.endsWith("List") || menu_node?.type.name === "blockquote");
  const block_index = menu_pos !== null ? editor.state.doc.resolve(menu_pos).index(0) : 0;

  const sections: ActionMenuSection[] = [
    {
      key: "turn-into",
      items: [
        {
          key: "turn-into",
          label: "Turn into",
          icon: <Repeat2 size={ICON_SIZE} />,
          disabled: !can_turn_into,
          submenu: TURN_INTO_BLOCKS.map((turn_block) => {
            const Icon = turn_block.icon;
            return {
              key: turn_block.key,
              label: turn_block.label,
              icon: <Icon size={ICON_SIZE} />,
              onClick: withMenuBlock((pos) => {
                editor.chain().focus().setTextSelection(TextSelection.near(editor.state.doc.resolve(pos + 1)).from).run();
                turnBlockInto(editor, turn_block);
              }),
            };
          }),
        },
      ],
    },
    {
      key: "arrange",
      items: [
        {
          key: "duplicate",
          label: "Duplicate",
          icon: <Copy size={ICON_SIZE} />,
          onClick: withMenuBlock((pos) => {
            const current = editor.state.doc.nodeAt(pos);
            if (current) editor.chain().focus().insertContentAt(pos + current.nodeSize, current.toJSON()).run();
          }),
        },
        {
          key: "move-up",
          label: "Move up",
          icon: <ArrowUpToLine size={ICON_SIZE} />,
          disabled: block_index === 0,
          onClick: withMenuBlock((pos) => moveBlock(pos, -1)),
        },
        {
          key: "move-down",
          label: "Move down",
          icon: <ArrowDownToLine size={ICON_SIZE} />,
          disabled: block_index >= editor.state.doc.childCount - 1,
          onClick: withMenuBlock((pos) => moveBlock(pos, 1)),
        },
      ],
    },
    {
      key: "delete",
      items: [
        {
          key: "delete",
          label: "Delete",
          icon: <Trash2 size={ICON_SIZE} />,
          danger: true,
          onClick: withMenuBlock((pos) => {
            const current = editor.state.doc.nodeAt(pos);
            if (current) editor.chain().focus().deleteRange({ from: pos, to: pos + current.nodeSize }).run();
          }),
        },
      ],
    },
  ];

  return (
    <>
      <div className="doc-block-handle" style={{ top: block.top }} contentEditable={false}>
        <button type="button" className="doc-block-handle-button" aria-label="Add a block below" title="Click to add a block below" onClick={handleAdd}>
          <Plus size={16} />
        </button>
        <button
          ref={grip_ref}
          type="button"
          draggable
          className="doc-block-handle-button is-grip"
          aria-label="Drag to move, click to open the block menu"
          title="Drag to move, click to open menu"
          onDragStart={handleDragStart}
          onClick={() => {
            setMenuPos(block.pos);
            onMenuOpenChange(true);
          }}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <ActionMenu
        anchor_el={grip_ref.current}
        is_open={menu_pos !== null}
        onClose={closeMenu}
        sections={sections}
        aria_label="Block options"
        width={220}
        align="start"
      />
    </>
  );
};

export default BlockHandle;
