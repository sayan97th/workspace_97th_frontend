import React, { useEffect, useRef } from "react";

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
      className="absolute left-0 top-[52px] z-[5] max-h-[260px] w-[300px] overflow-auto rounded-xl border border-shell-border-strong bg-shell-panel p-[5px] shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
    >
      <div className="px-[9px] pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">{title}</div>
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
          className={`flex w-full flex-col rounded-lg px-[9px] py-1.5 text-left ${index === active_index ? "bg-shell-hover" : ""}`}
        >
          <span className="truncate text-[13px] font-medium text-shell-text">{item.label}</span>
          {item.description && <span className="truncate text-[11.5px] text-shell-text-faint">{item.description}</span>}
        </button>
      ))}
    </div>
  );
};

export default ComposerSuggestionMenu;
