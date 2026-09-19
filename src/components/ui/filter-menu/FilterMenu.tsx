"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { ChevronDownIcon } from "@/icons/workspace-icons";

export type FilterMenuOption = {
  id: string;
  name: string;
};

export type FilterMenuProps = {
  /** Short noun shown while nothing is chosen, e.g. "Board" or "Person". */
  label: string;
  /** The first row, which clears the filter, e.g. "All boards". */
  all_label: string;
  options: FilterMenuOption[];
  selected_id: string | null;
  onSelect: (id: string | null) => void;
  /** Fired each time the menu opens, so a caller can refresh `options` lazily. */
  onOpen?: () => void;
};

/** A compact dropdown chip that narrows a list to one option, such as one board or one person. */
const FilterMenu: React.FC<FilterMenuProps> = ({ label, all_label, options, selected_id, onSelect, onOpen }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const selected = options.find((option) => option.id === selected_id);

  const choose = (id: string | null) => {
    onSelect(id);
    setIsOpen(false);
  };

  const toggle = () => {
    if (!is_open) onOpen?.();
    setIsOpen((previous) => !previous);
  };

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={`flex max-w-[150px] items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
          selected
            ? "border-brand-500 text-shell-text"
            : "border-shell-border text-shell-text-muted hover:text-shell-text"
        }`}
      >
        <span className="truncate">{selected?.name ?? label}</span>
        <ChevronDownIcon size={10} className="flex-none" />
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={220} align="start">
        <div role="listbox" className="shell-scrollbar max-h-[260px] overflow-y-auto p-1.5">
          {[{ id: null, name: all_label }, ...options].map((option) => (
            <button
              key={option.id ?? "all"}
              type="button"
              role="option"
              aria-selected={option.id === selected_id}
              onClick={() => choose(option.id)}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-shell-hover ${
                option.id === selected_id ? "font-semibold text-shell-text" : "font-medium text-shell-text-secondary"
              }`}
            >
              <span className="truncate">{option.name}</span>
            </button>
          ))}
        </div>
      </BoardPopover>
    </>
  );
};

export default FilterMenu;
