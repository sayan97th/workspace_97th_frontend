"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { boardTreeFontClassName } from "../../board-tree-font";
import { COLUMN_GALLERY_SECTIONS, type ColumnTypeDef } from "../constants";
import ColumnTypeIcon from "./ColumnTypeIcon";
import "./column-type-gallery.css";

/** What the gallery needs to draw one column type. Callers may carry extra fields, `onPick` hands the same object back. */
export type ColumnTypeGalleryEntry = Pick<ColumnTypeDef, "kind" | "label" | "description" | "accent" | "section" | "glyph">;

interface ColumnTypeGalleryProps<T extends ColumnTypeGalleryEntry> {
  types: T[];
  query: string;
  onQueryChange: (value: string) => void;
  onPick: (type: T) => void;
  /** Escape. The caller decides whether that closes a popover or steps back to a parent menu. */
  onClose: () => void;
  /** Lists every section up front with no "More columns" footer, for the column menu's own "More columns" flyout. */
  show_all?: boolean;
  /** When set, the "More columns" footer opens the Column Center instead of listing the rest in place. */
  onOpenColumnCenter?: () => void;
}

/** Grid columns, used to move focus up and down a row with the arrow keys. */
const GRID_COLUMNS = 2;

const matchesQuery = (type: ColumnTypeGalleryEntry, term: string) =>
  !term || type.label.toLowerCase().includes(term) || type.description.toLowerCase().includes(term);

/**
 * monday.com style column type picker: a search box, the "Essentials" and
 * "Super useful" sections in a two column grid, and a "More columns" footer
 * that reveals the rest of the catalog. Searching looks through every type,
 * by name and description. Purely presentational, so the table "+" header,
 * the column menu flyout and the Kanban "Add field" menu all share it.
 */
export default function ColumnTypeGallery<T extends ColumnTypeGalleryEntry>({
  types,
  query,
  onQueryChange,
  onPick,
  onClose,
  show_all = false,
  onOpenColumnCenter,
}: ColumnTypeGalleryProps<T>) {
  const [is_expanded, setIsExpanded] = useState(false);
  const grid_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const is_searching = term.length > 0;
  const shows_every_section = show_all || is_expanded || is_searching;

  const sections = useMemo(
    () =>
      COLUMN_GALLERY_SECTIONS.filter((section) => shows_every_section || section !== "More columns")
        .map((section) => ({ section, items: types.filter((type) => type.section === section && matchesQuery(type, term)) }))
        .filter((group) => group.items.length > 0),
    [types, term, shows_every_section]
  );
  const visible_types = sections.flatMap((group) => group.items);

  // Expanding reveals the "More columns" section below the fold, so bring it into view.
  useEffect(() => {
    if (!is_expanded) return;
    grid_ref.current?.querySelector('[aria-label="More columns"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [is_expanded]);

  const focusOption = (index: number) => {
    const options = grid_ref.current?.querySelectorAll<HTMLButtonElement>("[data-gallery-option]");
    if (!options?.length) return;
    if (index < 0) {
      search_ref.current?.focus();
      return;
    }
    options[Math.min(index, options.length - 1)]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Keys stay here, so a parent menu (the column menu flyout) doesn't also react to arrows or Escape.
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    const target = event.target as HTMLElement;
    if (target === search_ref.current) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusOption(0);
      } else if (event.key === "Enter" && is_searching && visible_types[0]) {
        event.preventDefault();
        onPick(visible_types[0]);
      }
      return;
    }
    const index = Number(target.dataset.galleryOption);
    if (Number.isNaN(index)) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: GRID_COLUMNS, ArrowUp: -GRID_COLUMNS }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    focusOption(index + step);
  };

  return (
    <div className={`column-type-gallery ${boardTreeFontClassName}`} onKeyDown={handleKeyDown}>
      <div className="column-type-gallery__search">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="column-type-gallery__search-icon">
          <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={search_ref}
          autoFocus
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search or describe your column"
          aria-label="Search or describe your column"
          className="column-type-gallery__input"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onQueryChange("");
              search_ref.current?.focus();
            }}
            className="column-type-gallery__clear"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div ref={grid_ref} className="column-type-gallery__body" role="listbox" aria-label="Column types">
        {sections.length === 0 ? (
          <p className="column-type-gallery__empty">
            No column types match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          sections.map(({ section, items }) => (
            <div key={section} role="group" aria-label={section} className="column-type-gallery__section">
              <div className="column-type-gallery__heading">{section}</div>
              <div className="column-type-gallery__grid">
                {items.map((type) => {
                  const index = visible_types.indexOf(type);
                  return (
                    <button
                      key={type.kind + type.label}
                      type="button"
                      role="option"
                      aria-selected="false"
                      data-gallery-option={index}
                      onClick={() => onPick(type)}
                      className="column-type-gallery__option"
                    >
                      <ColumnTypeIcon kind={type.kind} glyph={type.glyph} accent={type.accent} />
                      <span className="column-type-gallery__label">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {!show_all && !is_searching && (
        <div className="column-type-gallery__footer">
          {onOpenColumnCenter ? (
            <button type="button" onClick={onOpenColumnCenter} className="column-type-gallery__more">
              More columns
            </button>
          ) : (
            <button type="button" aria-expanded={is_expanded} onClick={() => setIsExpanded((value) => !value)} className="column-type-gallery__more">
              {is_expanded ? "Fewer columns" : "More columns"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
