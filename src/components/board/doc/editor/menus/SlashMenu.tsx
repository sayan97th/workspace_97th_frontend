"use client";
import React, { useEffect, useRef } from "react";
import { exitSuggestion } from "@tiptap/suggestion";
import { DOC_BLOCK_GROUP_LABELS, type DocBlock, type DocBlockGroup } from "../doc-blocks";
import { SLASH_COMMAND_KEY } from "../extensions/slash-command";
import { useDocEditor } from "../DocEditorContext";
import { useSuggestionState } from "../suggestion-store";
import FloatingSuggestion from "./FloatingSuggestion";

const GROUP_ORDER: DocBlockGroup[] = ["basic", "media", "inline"];

/**
 * The "/" block menu, laid out like Notion's: grouped rows with an icon,
 * the block name and its markdown shortcut, the highlighted row kept in view,
 * and a "Close menu" footer.
 */
const SlashMenu: React.FC = () => {
  const { editor, slash_store } = useDocEditor();
  const state = useSuggestionState(slash_store);
  const list_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [state.selected_index, state.is_open]);

  if (!state.is_open || !editor) return null;

  const closeMenu = () => {
    exitSuggestion(editor.view, SLASH_COMMAND_KEY);
    slash_store.close();
    editor.commands.focus();
  };

  const groups = GROUP_ORDER.map((group) => ({
    group,
    blocks: state.items.filter((block) => block.group === group),
  })).filter((entry) => entry.blocks.length > 0);

  const renderRow = (block: DocBlock) => {
    const index = state.items.indexOf(block);
    const is_selected = index === state.selected_index;
    const Icon = block.icon;
    return (
      <button
        key={block.key}
        type="button"
        role="option"
        aria-selected={is_selected}
        data-selected={is_selected}
        className="doc-menu-row"
        onMouseEnter={() => slash_store.setState({ selected_index: index })}
        onClick={() => state.command?.(block)}
      >
        <Icon size={18} strokeWidth={1.75} className="doc-menu-row-icon" />
        <span className="doc-menu-row-label">{block.label}</span>
        {block.shortcut && <span className="doc-menu-row-shortcut">{block.shortcut}</span>}
      </button>
    );
  };

  return (
    <FloatingSuggestion getRect={state.getRect} width={324} max_height={400}>
      <div ref={list_ref} role="listbox" aria-label="Insert a block" className="doc-menu-list">
        {groups.length === 0 ? (
          <div className="doc-menu-empty">No results</div>
        ) : (
          groups.map((entry, index) => (
            <div key={entry.group} className={index > 0 ? "doc-menu-section is-divided" : "doc-menu-section"}>
              <div className="doc-menu-section-label">{DOC_BLOCK_GROUP_LABELS[entry.group]}</div>
              {entry.blocks.map(renderRow)}
            </div>
          ))
        )}
      </div>
      <button type="button" className="doc-menu-footer" onClick={closeMenu}>
        <span>Close menu</span>
        <span className="doc-menu-row-shortcut">esc</span>
      </button>
    </FloatingSuggestion>
  );
};

export default SlashMenu;
