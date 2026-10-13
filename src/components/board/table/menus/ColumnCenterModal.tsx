"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { boardTreeFontClassName } from "../../board-tree-font";
import type { ColumnTypeDef } from "../constants";
import ColumnTypeIcon from "./ColumnTypeIcon";
import {
  COLUMN_CENTER_ALL_ENTRIES,
  COLUMN_CENTER_CATEGORIES,
  COLUMN_CENTER_COMBOS,
  COLUMN_CENTER_FEATURED,
  COLUMN_CENTER_SECTIONS,
  type ColumnCenterCategoryId,
  type ColumnCenterEntry,
  type ColumnCenterFeature,
} from "./columnCenterCatalog";
import "./column-center.css";

interface ColumnCenterModalProps {
  /** Adds the picked columns, in order. A combo hands over several. */
  onAdd: (types: ColumnTypeDef[]) => void;
  onClose: () => void;
}

/**
 * monday.com's Column Center: every column type by category, a category rail
 * that follows the scroll, a search box over every card, featured cards with
 * an illustration and combos that add several columns at once.
 */
export default function ColumnCenterModal({ onAdd, onClose }: ColumnCenterModalProps) {
  const [query, setQuery] = useState("");
  const [active_category, setActiveCategory] = useState<ColumnCenterCategoryId>("featured");
  const scroll_ref = useRef<HTMLDivElement>(null);
  const section_refs = useRef<Partial<Record<ColumnCenterCategoryId, HTMLElement | null>>>({});
  // While a rail click scrolls, the scroll spy would flicker through the sections in between.
  const is_jumping_ref = useRef(false);
  const term = query.trim().toLowerCase();

  const results = useMemo(
    () =>
      term
        ? COLUMN_CENTER_ALL_ENTRIES.filter((card) => `${card.title} ${card.description}`.toLowerCase().includes(term))
        : [],
    [term]
  );

  const add = (types: ColumnTypeDef[]) => {
    onAdd(types);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [onClose]);

  // Scroll spy: the active category is the last section whose top passed the top of the list.
  useEffect(() => {
    const scroll_el = scroll_ref.current;
    if (!scroll_el || term) return;
    const handleScroll = () => {
      if (is_jumping_ref.current) return;
      const top = scroll_el.getBoundingClientRect().top + 24;
      let current: ColumnCenterCategoryId = "featured";
      for (const category of COLUMN_CENTER_CATEGORIES) {
        const section = section_refs.current[category.id];
        if (section && section.getBoundingClientRect().top <= top) current = category.id;
      }
      if (scroll_el.scrollTop + scroll_el.clientHeight >= scroll_el.scrollHeight - 4) current = COLUMN_CENTER_CATEGORIES[COLUMN_CENTER_CATEGORIES.length - 1].id;
      setActiveCategory(current);
    };
    scroll_el.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroll_el.removeEventListener("scroll", handleScroll);
  }, [term]);

  const jumpTo = (category: ColumnCenterCategoryId) => {
    setQuery("");
    setActiveCategory(category);
    is_jumping_ref.current = true;
    // After the search results (if any) are swapped back for the sections.
    requestAnimationFrame(() => {
      const scroll_el = scroll_ref.current;
      const section = section_refs.current[category];
      if (scroll_el && section) {
        // The scroll area is the sections' offset parent, so `offsetTop` is already relative to it.
        scroll_el.scrollTo({ top: section.offsetTop - 8, behavior: "smooth" });
      }
      setTimeout(() => (is_jumping_ref.current = false), 600);
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={`column-center ${boardTreeFontClassName}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="column-center__dialog" role="dialog" aria-modal="true" aria-labelledby="column-center-title">
        <header className="column-center__header">
          <h2 id="column-center-title" className="column-center__title">
            Column Center
          </h2>
          <label className="column-center__search">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search column types" />
          </label>
          <button type="button" aria-label="Close Column Center" onClick={onClose} className="column-center__close">
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="column-center__main">
          <nav className="column-center__nav" aria-label="Categories">
            <div className="column-center__nav-title">Categories</div>
            {COLUMN_CENTER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-current={!term && active_category === category.id ? "true" : undefined}
                onClick={() => jumpTo(category.id)}
                className="column-center__nav-item"
              >
                {category.label}
              </button>
            ))}
          </nav>

          <div ref={scroll_ref} className="column-center__content">
            {term ? (
              <section className="column-center__section" aria-label="Search results">
                <h3 className="column-center__section-title">
                  {results.length ? `Results for "${query.trim()}"` : `No columns match "${query.trim()}"`}
                </h3>
                {results.length > 0 && <CardGrid cards={results} onAdd={add} />}
              </section>
            ) : (
              <>
                <section ref={(el) => void (section_refs.current.featured = el)} className="column-center__section" aria-labelledby="column-center-featured">
                  <h3 id="column-center-featured" className="column-center__section-title">
                    Featured
                  </h3>
                  <div className="column-center__featured">
                    {COLUMN_CENTER_FEATURED.map((card) => (
                      <FeaturedCard key={card.id} card={card} onAdd={() => add([card.type])} />
                    ))}
                  </div>
                </section>
                {(Object.keys(COLUMN_CENTER_SECTIONS) as (keyof typeof COLUMN_CENTER_SECTIONS)[]).map((category_id) => {
                  const category = COLUMN_CENTER_CATEGORIES.find((entry) => entry.id === category_id)!;
                  return (
                    <section
                      key={category_id}
                      ref={(el) => void (section_refs.current[category_id] = el)}
                      className="column-center__section"
                      aria-labelledby={`column-center-${category_id}`}
                    >
                      <h3 id={`column-center-${category_id}`} className="column-center__section-title">
                        {category.label}
                      </h3>
                      <CardGrid cards={COLUMN_CENTER_SECTIONS[category_id]} onAdd={add} />
                    </section>
                  );
                })}
                <section ref={(el) => void (section_refs.current.combos = el)} className="column-center__section" aria-labelledby="column-center-combos">
                  <h3 id="column-center-combos" className="column-center__section-title">
                    Combos
                  </h3>
                  <div className="column-center__grid">
                    {COLUMN_CENTER_COMBOS.map((combo) => (
                      <article key={combo.id} className="column-center__card">
                        <span className="column-center__combo-icons" data-count={combo.entries.length} aria-hidden="true">
                          {combo.entries.map((card) => (
                            <ColumnTypeIcon key={card.id} kind={card.type.kind} glyph={card.type.glyph} accent={card.accent} size={combo.entries.length > 2 ? 30 : 36} />
                          ))}
                        </span>
                        <div className="column-center__card-text">
                          <h4 className="column-center__card-title">{combo.title}</h4>
                          <p className="column-center__card-description">
                            {combo.entries.map((card) => card.title).join(" + ")}. {combo.description}
                          </p>
                        </div>
                        <button type="button" onClick={() => add(combo.entries.map((card) => card.type))} className="column-center__add">
                          Add to board
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CardGrid({ cards, onAdd }: { cards: ColumnCenterEntry[]; onAdd: (types: ColumnTypeDef[]) => void }) {
  return (
    <div className="column-center__grid">
      {cards.map((card) => (
        <article key={card.id} className="column-center__card">
          <ColumnTypeIcon kind={card.type.kind} glyph={card.type.glyph} accent={card.accent} size={64} className="column-center__icon" />
          <div className="column-center__card-text">
            <h4 className="column-center__card-title">{card.title}</h4>
            <p className="column-center__card-description">{card.description}</p>
          </div>
          <button type="button" aria-label={`Add ${card.title} to board`} onClick={() => onAdd([card.type])} className="column-center__add">
            Add to board
          </button>
        </article>
      ))}
    </div>
  );
}

function FeaturedCard({ card, onAdd }: { card: ColumnCenterFeature; onAdd: () => void }) {
  return (
    <article className="column-center__feature">
      <FeatureIllustration kind={card.illustration} />
      <h4 className="column-center__card-title">{card.title}</h4>
      <p className="column-center__card-description">{card.description}</p>
      <button type="button" aria-label={`Add ${card.title} to board`} onClick={onAdd} className="column-center__add column-center__add--wide">
        Add to board
      </button>
    </article>
  );
}

/** The featured cards' artwork, after monday.com's: two linked items, a status battery and a running timer. */
function FeatureIllustration({ kind }: { kind: ColumnCenterFeature["illustration"] }) {
  if (kind === "dependency") {
    return (
      <svg viewBox="0 0 262 140" className="column-center__art" role="img" aria-label="Two items linked by a dependency arrow">
        <rect width="262" height="140" fill="#ffcb00" />
        <rect x="-20" y="18" width="110" height="42" rx="21" fill="#784bd1" />
        <rect x="0" y="34" width="68" height="8" rx="4" fill="#ffffff" opacity="0.35" />
        <rect x="158" y="68" width="130" height="42" rx="21" fill="#00c875" />
        <rect x="176" y="85" width="86" height="8" rx="4" fill="#ffffff" opacity="0.35" />
        <path d="M92 39c26 0 22 50 50 50h6" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="m141 81 9 8-9 8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="92" cy="39" r="5" fill="#ffffff" />
      </svg>
    );
  }
  if (kind === "progress_tracking") {
    return (
      <svg viewBox="0 0 262 140" className="column-center__art" role="img" aria-label="A progress battery at 90 percent done">
        <rect width="262" height="140" fill="#784bd1" />
        <rect x="26" y="-14" width="212" height="36" rx="2" fill="#00c875" />
        <path d="M70 -14h168v36H82z" fill="#784bd1" opacity="0.9" />
        <rect x="26" y="44" width="212" height="46" rx="2" fill="#00c875" />
        <path d="M206 44h32v46h-12z" fill="#784bd1" />
        <text x="122" y="75" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="700" fontFamily="inherit">
          90<tspan fontSize="13">%</tspan> Done
        </text>
        <rect x="26" y="112" width="212" height="40" rx="2" fill="#00c875" />
        <path d="M76 112h162v40H92z" fill="#784bd1" opacity="0.9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 262 140" className="column-center__art" role="img" aria-label="A running timer at 12 hours 17 minutes">
      <rect width="262" height="140" fill="#f65f7c" />
      <rect x="28" y="39" width="206" height="62" rx="6" fill="#ffffff" />
      <circle cx="58" cy="70" r="15" fill="#0073ea" />
      <path d="M54 62v16l12-8z" fill="#ffffff" />
      <text x="88" y="79" fill="#323338" fontSize="24" fontWeight="500" fontFamily="inherit">
        12<tspan fontSize="17">h</tspan> 17<tspan fontSize="17">m</tspan> 4<tspan fontSize="17">s</tspan>
      </text>
    </svg>
  );
}
