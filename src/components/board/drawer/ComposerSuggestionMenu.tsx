import React, { useEffect, useRef } from "react";
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
};

/**
 * The dropdown under a composer for the `/` command menu and the `#` item
 * picker. It only draws: the composer owns the keyboard cursor, because Enter,
 * Tab and the arrow keys must be intercepted inside the editor.
 */
const ComposerSuggestionMenu: React.FC<ComposerSuggestionMenuProps> = ({ title, items, active_index, onPick, onHover }) => {
  const active_ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    active_ref.current?.scrollIntoView({ block: "nearest" });
  }, [active_index]);

  return (
    <div
      role="listbox"
      aria-label={title}
      className="rich-text-menu top-[52px] max-h-[280px] w-[300px]"
    >
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
  );
};

export default ComposerSuggestionMenu;
