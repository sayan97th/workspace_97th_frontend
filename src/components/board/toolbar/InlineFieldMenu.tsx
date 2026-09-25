"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/icons/workspace-icons";

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
};

/**
 * Reusable inline "column-picker" style dropdown: a bordered trigger button
 * that opens a floating option list absolutely positioned beneath it. Used by
 * every Sort-row field (column / direction / and-or) so the same interaction
 * and styling can be reused by Group-by or any future board panel.
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
    <div ref={container_ref} className={`relative min-w-0 ${className}`} style={width ? { width } : { flex: 1 }}>
      <button
        type="button"
        onClick={() => (is_open ? closeMenu() : setIsOpen(true))}
        className={`flex h-[38px] w-full items-center justify-between gap-2 rounded-lg border bg-boardtree-hover px-3 text-[13.5px] transition-colors ${
          is_open ? "border-boardtree-accent" : "border-boardtree-border hover:border-boardtree-text-faint"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-[9px] overflow-hidden">{renderValue()}</span>
        <ChevronDownIcon
          size={11}
          className={`flex-none text-boardtree-text-muted transition-transform ${is_open ? "rotate-180" : ""}`}
        />
      </button>

      {is_open && (
        <div
          className="absolute left-0 top-[calc(100%+5px)] z-[210] w-full min-w-[220px] overflow-y-auto rounded-[9px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-2xl shadow-black/50"
          style={{ maxHeight: menu_max_height }}
        >
          {getSearchText && (
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={search_placeholder}
              className="mb-1 h-8 w-full rounded-md border border-boardtree-border bg-boardtree-hover px-2.5 text-[13px] text-boardtree-text placeholder:text-boardtree-text-faint focus:border-boardtree-accent focus:outline-none"
            />
          )}
          {menu_heading && (
            <div className="px-2 pb-1 pt-1 text-[11.5px] font-semibold tracking-wide text-boardtree-text-faint">
              {menu_heading}
            </div>
          )}
          {visible_options.length === 0 && (
            <div className="px-2 py-2 text-[13px] text-boardtree-text-muted">{empty_label}</div>
          )}
          {visible_options.map((option) => {
            const selected = isSelected(option);
            return (
              <div
                key={getOptionId(option)}
                onClick={() => {
                  onSelect(option);
                  closeMenu();
                }}
                className={`flex cursor-pointer items-center gap-[10px] rounded-md px-2 py-2 text-[13.5px] font-medium text-boardtree-text hover:bg-boardtree-hover ${
                  selected ? "bg-boardtree-accent/[0.16]" : ""
                }`}
              >
                {renderOption(option)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InlineFieldMenu;
