"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditorState } from "@tiptap/react";
import { Plus } from "lucide-react";
import { useDocEditor } from "./DocEditorContext";
import BlockHandle, { type HoveredBlock } from "./menus/BlockHandle";
import SlashMenu from "./menus/SlashMenu";
import MentionMenu from "./menus/MentionMenu";
import FormatBubbleMenu from "./menus/FormatBubbleMenu";
import TableBubbleMenu from "./menus/TableBubbleMenu";

const HANDLE_HEIGHT = 24;
const FALLBACK_LINE_HEIGHT = 26;

/**
 * The writing area: the editor itself plus everything floating over it, the
 * block handle in the left gutter, the "/" and "@" menus and the selection
 * and table bubbles. An empty doc shows monday's blue "+" on its first line.
 */
const DocEditorSurface: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { editor, editable } = useDocEditor();
  const surface_ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoveredBlock | null>(null);
  const is_menu_open_ref = useRef(false);

  const is_empty = useEditorState({ editor, selector: ({ editor: current }) => current?.isEmpty ?? true });

  /** Where the first line of the top level block at `pos` sits inside the surface. */
  const measureBlock = useCallback(
    (pos: number): HoveredBlock | null => {
      if (!editor || !surface_ref.current) return null;
      const dom = editor.view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return null;
      const surface_rect = surface_ref.current.getBoundingClientRect();
      const rect = dom.getBoundingClientRect();
      const style = window.getComputedStyle(dom);
      const line_height = parseFloat(style.lineHeight) || FALLBACK_LINE_HEIGHT;
      const padding_top = parseFloat(style.paddingTop) || 0;
      const first_line = Math.min(line_height, rect.height || line_height);
      return { pos, top: rect.top - surface_rect.top + padding_top + first_line / 2 - HANDLE_HEIGHT / 2 };
    },
    [editor]
  );

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!editor || !editable || is_menu_open_ref.current) return;
    const view = editor.view;
    const content_rect = view.dom.getBoundingClientRect();
    // Probe a little inside the text column, so hovering the gutter still finds the block on that line.
    const left = Math.min(Math.max(event.clientX, content_rect.left + 24), content_rect.right - 24);
    const hit = view.posAtCoords({ left, top: event.clientY });
    if (!hit) return;
    const resolved_pos = hit.inside >= 0 ? hit.inside : hit.pos;
    const $pos = view.state.doc.resolve(Math.min(resolved_pos, view.state.doc.content.size));
    const block_pos = $pos.depth === 0 ? resolved_pos : $pos.before(1);
    if (!view.state.doc.nodeAt(block_pos)) return;
    if (hovered?.pos === block_pos) return;
    setHovered(measureBlock(block_pos));
  };

  // Typing moves blocks around, so the handle re-measures (or hides) after each change.
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      if (is_menu_open_ref.current) return;
      setHovered((current) => {
        if (!current) return current;
        const node = editor.state.doc.nodeAt(current.pos);
        return node ? measureBlock(current.pos) : null;
      });
    };
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, measureBlock]);

  // The editor mounts its DOM after the first render, so the empty state "+" is measured a frame later.
  const [empty_block, setEmptyBlock] = useState<HoveredBlock | null>(null);
  useEffect(() => {
    if (!is_empty || !editable) {
      setEmptyBlock(null);
      return;
    }
    const frame = window.requestAnimationFrame(() => setEmptyBlock(measureBlock(0)));
    return () => window.cancelAnimationFrame(frame);
  }, [is_empty, editable, measureBlock]);

  return (
    <div
      ref={surface_ref}
      className={`doc-surface ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (!is_menu_open_ref.current) setHovered(null);
      }}
    >
      <EditorContent editor={editor} />

      {editable && empty_block ? (
        <button
          type="button"
          className="doc-empty-add"
          style={{ top: empty_block.top }}
          aria-label="Add a block"
          title="Add a block"
          onClick={() => editor?.chain().focus().setTextSelection(1).insertContent("/").run()}
        >
          <Plus size={16} strokeWidth={2.25} />
        </button>
      ) : (
        editable && (
          <BlockHandle
            block={hovered}
            onMenuOpenChange={(is_open) => {
              is_menu_open_ref.current = is_open;
              if (!is_open) setHovered(null);
            }}
          />
        )
      )}

      <SlashMenu />
      <MentionMenu />
      <FormatBubbleMenu />
      <TableBubbleMenu />
    </div>
  );
};

export default DocEditorSurface;
