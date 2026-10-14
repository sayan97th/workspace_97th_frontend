"use client";
import React, { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { ChevronDownIcon, SearchIcon } from "@/icons/workspace-icons";
import "./field-menu.css";

export type InlineFieldMenuProps<TOption> = {
  options: TOption[];
  getOptionId: (option: TOption) => string;
  isSelected: (option: TOption) => boolean;
  onSelect: (option: TOption) => void;
  renderOption: (option: TOption) => React.ReactNode;
  /** Trigger button content, e.g. a swatch + label or a direction icon + label. */
  renderValue: () => React.ReactNode;
  /** Optional heading rendered above the option list, e.g. "Item columns". */
  menu_heading?: string;
  /** Trigger width. Defaults to filling its flex parent. */
  width?: number;
  className?: string;
  menu_max_height?: number;
  /** Shows a search box above the options, matched against `getSearchText` (case insensitive). */
  getSearchText?: (option: TOption) => string;
  search_placeholder?: string;
  /** Rendered when the search matches nothing. */
  empty_label?: string;
  /** Shows a small "x" in the trigger that clears the current pick, e.g. a filter rule's column. */
  onClear?: () => void;
  clear_label?: string;
};

/**
 * Reusable inline "column-picker" style dropdown: a bordered trigger button
 * that opens a floating option list absolutely positioned beneath it. Used by
 * the Filter, Sort, Group by and Conditional coloring rows and the Chart
 * settings, so every board panel shares the same monday style field (see
 * `field-menu.css`).
 */
function InlineFieldMenu<TOption>({
  options,
  getOptionId,
  isSelected,
  onSelect,
  renderOption,
  renderValue,
  menu_heading,
  width,
  className = "",
  menu_max_height = 280,
  getSearchText,
  search_placeholder = "Search",
  empty_label = "No results",
  onClear,
  clear_label = "Clear",
}: InlineFieldMenuProps<TOption>) {
  const [is_open, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const container_ref = useRef<HTMLDivElement>(null);

  const trimmed_query = query.trim().toLowerCase();
  const visible_options =
    getSearchText && trimmed_query
      ? options.filter((option) => getSearchText(option).toLowerCase().includes(trimmed_query))
      : options;

  const closeMenu = () => {
    setIsOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Keep the Escape here so the enclosing toolbar popover stays open.
      event.stopPropagation();
      setIsOpen(false);
      setQuery("");
    };

    document.addEventListener("mousedown", handlePointerDown);
    // Capture phase, so this runs before BoardPopover's own document-level
    // Escape handler and can stop it from closing the whole panel.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [is_open]);

  return (
    <div ref={container_ref} className={`field-menu ${className}`} style={width ? { width } : { flex: 1 }}>
      <div className="field-menu__trigger field-menu__trigger--split" aria-expanded={is_open}>
        <button
          type="button"
          onClick={() => (is_open ? closeMenu() : setIsOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={is_open}
          className="field-menu__trigger-button"
        >
          <span className="field-menu__value">{renderValue()}</span>
          {!onClear && (
            <span className="field-menu__chevron">
              <ChevronDownIcon size={11} />
            </span>
          )}
        </button>
        {onClear && (
          <span className="field-menu__trigger-end">
            <button type="button" onClick={onClear} aria-label={clear_label} title={clear_label} className="field-menu__clear">
              <CloseIcon size={10} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => (is_open ? closeMenu() : setIsOpen(true))}
              className="field-menu__chevron field-menu__chevron-button"
            >
              <ChevronDownIcon size={11} />
            </button>
          </span>
        )}
      </div>

      {is_open && (
        <div className="field-menu__popup" role="listbox" style={{ maxHeight: menu_max_height }}>
          {getSearchText && (
            <div className="field-menu__search">
              <span className="field-menu__search-icon">
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={search_placeholder}
                className="field-menu__search-input"
              />
            </div>
          )}
          {menu_heading && <div className="field-menu__heading">{menu_heading}</div>}
          {visible_options.length === 0 && <div className="field-menu__empty">{empty_label}</div>}
          <div className="field-menu__list">
            {visible_options.map((option) => (
              <div
                key={getOptionId(option)}
                role="option"
                aria-selected={isSelected(option)}
                onClick={() => {
                  onSelect(option);
                  closeMenu();
                }}
                className="field-menu__option"
              >
                {renderOption(option)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InlineFieldMenu;
