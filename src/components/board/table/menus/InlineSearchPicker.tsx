"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { boardTreeFontClassName } from "../../board-tree-font";
import PopoverPanel from "./PopoverPanel";
import "./inline-search-picker.css";

export interface InlineSearchOption {
  id: string;
  label: string;
  /** Faint text after the label (a time zone's current time, a landmark's city). */
  hint?: string;
  /** Native hover text, for a label the list may cut off. */
  title?: string;
  leading?: ReactNode;
}

interface InlineSearchPickerProps {
  /** The field's placeholder, also its accessible name ("Timezone", "Search location"). */
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** Bold heading above the list, monday's Location card has one, the World clock list does not. */
  title?: string;
  options: InlineSearchOption[];
  /** The option holding the cell's current value, marked with a check. */
  selected_id?: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
  /** Shown instead of the list when no option matches. */
  empty_label: string;
  /** Extra actions under the list (Clear, Open in Google Maps). */
  footer?: ReactNode;
  /** "card" floats a roomy shadowed card (Location), "list" hangs a flat outlined list right under the field (World clock). */
  variant?: "card" | "list";
}

/**
 * monday style in cell search: the open cell turns into an outlined text
 * field (laid over the cell through `PopoverPanel`'s `anchor_overlay`) and
 * the matches hang right under it. Arrow keys move the highlight, Enter picks
 * it, Escape closes. Shared by the World clock and Location cells.
 */
export default function InlineSearchPicker({
  placeholder,
  query,
  onQueryChange,
  title,
  options,
  selected_id = null,
  onPick,
  onClose,
  empty_label,
  footer,
  variant = "card",
}: InlineSearchPickerProps) {
  const [highlighted_index, setHighlightedIndex] = useState(0);
  const list_ref = useRef<HTMLDivElement>(null);
  const active_index = options.length === 0 ? -1 : Math.min(highlighted_index, options.length - 1);

  useEffect(() => {
    list_ref.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active_index]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (options.length) setHighlightedIndex((active_index + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (options.length) setHighlightedIndex((active_index - 1 + options.length) % options.length);
        break;
      case "Enter":
        event.preventDefault();
        if (active_index >= 0) onPick(options[active_index].id);
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  };

  const list_id = `inline-search-${placeholder.replace(/\W+/g, "-").toLowerCase()}`;
  const field = (
    <div className={`inline-search-field ${boardTreeFontClassName}`}>
      <input
        autoFocus
        value={query}
        onChange={(event) => {
          // A new search starts back at the first match.
          setHighlightedIndex(0);
          onQueryChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded="true"
        aria-controls={list_id}
        aria-activedescendant={active_index >= 0 ? `${list_id}-${active_index}` : undefined}
        autoComplete="off"
        spellCheck={false}
        className="inline-search-field__input"
      />
    </div>
  );

  return (
    <PopoverPanel
      unstyled
      onClose={onClose}
      anchor_overlay={field}
      className={variant === "list" ? "left-[6px] right-[6px] top-[calc(100%-4px)]" : "left-0 top-[calc(100%+6px)]"}
    >
      <div className={`inline-search inline-search--${variant} ${boardTreeFontClassName}`}>
        {title && <div className="inline-search__title">{title}</div>}
        <div ref={list_ref} id={list_id} role="listbox" aria-label={title ?? placeholder} className="inline-search__list shell-scrollbar">
          {options.length === 0 ? (
            <div className="inline-search__empty">{empty_label}</div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.id}
                id={`${list_id}-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={option.id === selected_id}
                data-highlighted={index === active_index}
                onMouseMove={() => index !== active_index && setHighlightedIndex(index)}
                onClick={() => onPick(option.id)}
                title={option.title}
                className="inline-search__option"
              >
                {option.leading}
                <span className="inline-search__option-label">{option.label}</span>
                {option.hint && <span className="inline-search__option-hint">{option.hint}</span>}
                {option.id === selected_id && (
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="inline-search__check">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.75" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
        {footer && <div className="inline-search__footer">{footer}</div>}
      </div>
    </PopoverPanel>
  );
}
