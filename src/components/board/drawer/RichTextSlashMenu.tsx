"use client";
import React, { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { exitSuggestion } from "@tiptap/suggestion";
import FloatingSuggestion from "../doc/editor/menus/FloatingSuggestion";
import { useSuggestionState, type SuggestionStore } from "../doc/editor/suggestion-store";
import { RICH_TEXT_SLASH_KEY } from "./richTextSlashCommand";
import { RICH_TEXT_SLASH_GROUPS, type RichTextSlashItem } from "./richTextSlashItems";
import "./rich-text.css";

type RichTextSlashMenuProps = {
  editor: Editor;
  store: SuggestionStore<RichTextSlashItem>;
};

const MENU_WIDTH = 264;
const MENU_MAX_HEIGHT = 400;

/**
 * The composer's "/" menu, laid out like the doc editor's (monday's): rows
 * grouped under "Basic blocks", "Media", "Inline" and "Saved replies", each
 * with its icon and Markdown shortcut keycap, and a "Close menu" footer.
 * Anchored to the caret, flipped above it when there is no room below. The
 * highlighted row is kept in view while the arrows move it.
 */
const RichTextSlashMenu: React.FC<RichTextSlashMenuProps> = ({ editor, store }) => {
  const state = useSuggestionState(store);
  const list_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [state.selected_index, state.is_open]);

  if (!state.is_open) return null;

  const closeMenu = () => {
    exitSuggestion(editor.view, RICH_TEXT_SLASH_KEY);
    store.close();
    editor.commands.focus();
  };

  const sections = RICH_TEXT_SLASH_GROUPS.map((entry) => ({
    ...entry,
    items: state.items.filter((item) => item.group === entry.group),
  })).filter((section) => section.items.length > 0);

  const renderRow = (item: RichTextSlashItem) => {
    const index = state.items.indexOf(item);
    const is_selected = index === state.selected_index;
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        type="button"
        role="option"
        aria-selected={is_selected}
        data-selected={is_selected}
        className="rich-text-slash-row"
        onMouseEnter={() => store.setState({ selected_index: index })}
        onClick={() => state.command?.(item)}
      >
        <Icon size={16} strokeWidth={1.75} className="rich-text-slash-row__icon" aria-hidden="true" />
        <span className="rich-text-slash-row__text">
          <span className="rich-text-slash-row__label">{item.label}</span>
          {item.description && <span className="rich-text-slash-row__description">{item.description}</span>}
        </span>
        {item.shortcut && <kbd className="rich-text-slash-row__key">{item.shortcut}</kbd>}
      </button>
    );
  };

  return (
    <FloatingSuggestion
      getRect={state.getRect}
      width={MENU_WIDTH}
      max_height={MENU_MAX_HEIGHT}
      class_name="rich-text-slash-menu"
    >
      <div ref={list_ref} role="listbox" aria-label="Insert a block" className="rich-text-slash-menu__list">
        {sections.length === 0 ? (
          <div className="rich-text-slash-menu__empty">No results</div>
        ) : (
          sections.map((section) => (
            <div key={section.group} role="group" aria-label={section.label} className="rich-text-slash-menu__section">
              <div className="rich-text-slash-menu__section-label">{section.label}</div>
              {section.items.map(renderRow)}
            </div>
          ))
        )}
      </div>
      <button type="button" className="rich-text-slash-menu__footer" onClick={closeMenu}>
        <span>Close menu</span>
        <span className="rich-text-slash-menu__footer-key">esc</span>
      </button>
    </FloatingSuggestion>
  );
};

export default RichTextSlashMenu;
