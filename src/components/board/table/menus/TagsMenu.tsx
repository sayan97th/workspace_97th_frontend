"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { boardTreeFontClassName } from "../../board-tree-font";
import type { TagDef } from "../types";
import { formatTagLabel, tagSearchKey } from "../tagLabels";
import PopoverPanel from "./PopoverPanel";
import "./tags-picker.css";

interface TagsMenuProps {
  tag_defs: TagDef[];
  selected: string[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (id: string) => void;
  /** Creates a tag named after the query and selects it. Omitted, the "+ Create new tag" button is hidden. */
  onCreateTag?: () => void;
  onManageTags?: () => void;
  onClose: () => void;
}

/** A tag's color for the `--tag-color` variable the picker rows and chips read. */
const tagColorStyle = (color: string | undefined): CSSProperties => (color ? ({ "--tag-color": color } as CSSProperties) : {});

/**
 * Tags cell picker, monday.com style: the cell's tags sit as chips in the
 * "Add tags" field, the rest of the account's tags are listed in their own
 * color with how many items use each one, then "+ Create new tag" and
 * "Manage tags". The first match is highlighted, so typing and pressing
 * Enter picks it, or creates the tag when nothing matches exactly.
 * Backspace on an empty field removes the last chip. Styles live in
 * `tags-picker.css`.
 */
export default function TagsMenu({ tag_defs, selected, query, onQueryChange, onToggle, onCreateTag, onManageTags, onClose }: TagsMenuProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const list_ref = useRef<HTMLDivElement>(null);
  const [highlighted_index, setHighlightedIndex] = useState(0);
  // The cell's tags when the picker opened. Counts come from the API, so a tag
  // picked or removed here adjusts its own count until the next load.
  const [initial_selected] = useState(() => new Set(selected));

  const defs_by_id = useMemo(() => new Map(tag_defs.map((tag) => [tag.id, tag])), [tag_defs]);
  const query_key = tagSearchKey(query);
  const new_label = formatTagLabel(query);

  // Cells may still hold the raw label of an imported tag instead of its id, those match by label.
  const selected_defs = selected.map((entry) => defs_by_id.get(entry) ?? tag_defs.find((tag) => tagSearchKey(tag.label) === tagSearchKey(entry)) ?? null);
  const selected_ids = new Set(selected_defs.map((tag, index) => tag?.id ?? selected[index]));
  const options = tag_defs.filter((tag) => !selected_ids.has(tag.id) && tagSearchKey(tag.label).includes(query_key));
  const has_exact_match = tag_defs.some((tag) => tagSearchKey(tag.label) === query_key);
  const can_create = !!onCreateTag && query_key.length > 0 && !has_exact_match;
  // The create button is the last keyboard stop after the options.
  const stop_count = options.length + (can_create ? 1 : 0);
  const active_index = stop_count === 0 ? -1 : Math.min(highlighted_index, stop_count - 1);
  const is_create_highlighted = can_create && active_index === options.length;

  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>('[data-highlighted="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active_index]);

  const changeQuery = (value: string) => {
    onQueryChange(value);
    setHighlightedIndex(0);
  };

  const pickTag = (tag: TagDef) => {
    onToggle(tag.id);
    changeQuery("");
    input_ref.current?.focus();
  };

  const createTag = () => {
    if (!can_create) return;
    onCreateTag?.();
    setHighlightedIndex(0);
    input_ref.current?.focus();
  };

  const usageCount = (tag: TagDef): number | null => {
    if (tag.usage_count === undefined) return null;
    const delta = (selected_ids.has(tag.id) ? 1 : 0) - (initial_selected.has(tag.id) ? 1 : 0);
    return Math.max(0, tag.usage_count + delta);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (stop_count > 0) setHighlightedIndex((active_index + 1) % stop_count);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (stop_count > 0) setHighlightedIndex((active_index - 1 + stop_count) % stop_count);
        break;
      case "Enter":
        event.preventDefault();
        if (is_create_highlighted) createTag();
        else if (active_index >= 0) pickTag(options[active_index]);
        break;
      case "Backspace":
        if (query === "" && selected.length > 0) {
          event.preventDefault();
          onToggle(selected[selected.length - 1]);
        }
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-[calc(100%+4px)] -translate-x-1/2">
      <div className={`tags-picker ${boardTreeFontClassName}`}>
        <div className="tags-picker__field" onClick={() => input_ref.current?.focus()}>
          {selected.map((entry, index) => {
            const tag = selected_defs[index];
            const label = formatTagLabel(tag?.label ?? entry);
            return (
              <span key={entry} className="tags-picker__chip" style={tagColorStyle(tag?.color)} title={label}>
                <span className="tags-picker__chip-label">{label}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(entry);
                    input_ref.current?.focus();
                  }}
                  aria-label={`Remove ${label}`}
                  className="tags-picker__chip-remove"
                >
                  <CloseIcon size={10} />
                </button>
              </span>
            );
          })}
          <input
            ref={input_ref}
            autoFocus
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length > 0 ? "" : "Add tags"}
            aria-label="Add tags"
            role="combobox"
            aria-expanded="true"
            aria-controls="tags-picker-list"
            className="tags-picker__input"
          />
        </div>

        <div ref={list_ref} id="tags-picker-list" role="listbox" aria-label="Tags" className="tags-picker__list shell-scrollbar">
          {options.map((tag, index) => {
            const count = usageCount(tag);
            const label = formatTagLabel(tag.label);
            return (
              <button
                key={tag.id}
                type="button"
                role="option"
                aria-selected={index === active_index}
                data-highlighted={index === active_index}
                onMouseMove={() => index !== active_index && setHighlightedIndex(index)}
                onClick={() => pickTag(tag)}
                className="tags-picker__option"
                style={tagColorStyle(tag.color)}
                title={tag.is_shared ? `${label} is a public tag shared across the account` : label}
              >
                <span className="tags-picker__option-label">{label}</span>
                {count !== null && <span className="tags-picker__count">{count}</span>}
              </button>
            );
          })}
          {options.length === 0 && (
            <div className="tags-picker__empty">{query_key ? "No tags found" : tag_defs.length === 0 ? "No tags yet" : "All tags are added"}</div>
          )}
        </div>

        {onCreateTag && (
          <button
            type="button"
            disabled={!can_create}
            data-highlighted={is_create_highlighted}
            onMouseMove={() => can_create && !is_create_highlighted && setHighlightedIndex(options.length)}
            onClick={createTag}
            className="tags-picker__create"
          >
            <span className="tags-picker__create-label">{can_create ? `+ Create new tag "${new_label}"` : "+ Create new tag"}</span>
          </button>
        )}
        {onManageTags && (
          <button type="button" onClick={onManageTags} className="tags-picker__manage">
            Manage tags
          </button>
        )}
      </div>
    </PopoverPanel>
  );
}
