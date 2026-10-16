import React, { useEffect, useRef } from "react";
import FloatingSuggestion from "../doc/editor/menus/FloatingSuggestion";
import "./rich-text.css";

export type ComposerSuggestion = {
  id: string;
  label: string;
  description?: string;
};

export type ComposerSuggestionMenuProps = {
  /** Small caption above the list, e.g. "Commands" or "Link an item". */
  title: string;
  items: ComposerSuggestion[];
  /** The row the keyboard cursor sits on. */
  active_index: number;
  onPick: (index: number) => void;
  onHover: (index: number) => void;
  /** Screen rectangle of the typed trigger (the `#`), the menu opens right under it. */
  getAnchorRect: (() => DOMRect | null) | null;
};

const MENU_WIDTH = 300;
const MENU_MAX_HEIGHT = 280;

/**
 * The dropdown for the composer's `#` item picker, anchored under the typed
 * `#` so it never covers the text being typed. It only draws: the composer
 * owns the keyboard cursor, because Enter, Tab and the arrow keys must be
 * intercepted inside the editor.
 */
const ComposerSuggestionMenu: React.FC<ComposerSuggestionMenuProps> = ({ title, items, active_index, onPick, onHover, getAnchorRect }) => {
  const active_ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    active_ref.current?.scrollIntoView({ block: "nearest" });
  }, [active_index]);

  return (
    <FloatingSuggestion getRect={getAnchorRect} width={MENU_WIDTH} max_height={MENU_MAX_HEIGHT} class_name="rich-text-menu">
      <div role="listbox" aria-label={title}>
        <div className="rich-text-menu__title">{title}</div>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={index === active_index ? active_ref : undefined}
            type="button"
            role="option"
            aria-selected={index === active_index}
            // Keeps the editor focused, so picking never blurs it (which would drop the caret).
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(index)}
            onMouseEnter={() => onHover(index)}
            className="rich-text-menu__item"
          >
            <span className="min-w-0">
              <span className="rich-text-menu__label">{item.label}</span>
              {item.description && <span className="rich-text-menu__description">{item.description}</span>}
            </span>
          </button>
        ))}
      </div>
    </FloatingSuggestion>
  );
};

export default ComposerSuggestionMenu;
