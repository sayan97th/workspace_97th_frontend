"use client";
import React, { useState } from "react";
import { CheckIcon, PlusIcon } from "@/icons/board-icons";
import { COLUMN_OPTION_PALETTE } from "../columnTypes";

/** One colour-coded label a status/dropdown column offers. */
export type BoardCellOption = { id: string; label: string; color: string };

export type OptionPickerProps = {
  options: BoardCellOption[];
  /** Currently-selected option ids (a single-element array for status columns). */
  selected_ids: string[];
  /** true → dropdown (toggle many); false → status (pick one, replacing the current). */
  multi: boolean;
  onToggle: (option_id: string) => void;
  /** Clears the whole cell (single-select "no value"). */
  onClear: () => void;
  /**
   * Creates a new option on the column and resolves to it (with its persisted
   * id) so the picker can immediately select it. Return null to abort.
   */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
};

/**
 * Shared colour-coded option list for the Status (single-select) and Dropdown
 * (multi-select) cell editors. Optionally lets the user append a new option
 * inline, auto-colouring it from the shared palette. Reusable by any board cell
 * that edits a column's `config.options`.
 */
const OptionPicker: React.FC<OptionPickerProps> = ({
  options,
  selected_ids,
  multi,
  onToggle,
  onClear,
  onCreateOption,
}) => {
  const [new_label, setNewLabel] = useState("");
  const [is_creating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const label = new_label.trim();
    if (!label || !onCreateOption || is_creating) return;
    setIsCreating(true);
    const color = COLUMN_OPTION_PALETTE[options.length % COLUMN_OPTION_PALETTE.length];
    const created = await onCreateOption({ label, color });
    setIsCreating(false);
    if (created) {
      onToggle(created.id);
      setNewLabel("");
    }
  };

  return (
    <div className="flex flex-col gap-1 p-2" onClick={(event) => event.stopPropagation()}>
      {options.length === 0 && !onCreateOption && (
        <p className="px-1 py-3 text-center text-[12.5px] text-shell-text-faint">No options yet.</p>
      )}

      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
        {options.map((option) => {
          const is_selected = selected_ids.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-shell-hover"
            >
              <span
                className="h-[18px] w-[18px] flex-none rounded-[5px]"
                style={{ background: option.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] text-shell-text">{option.label}</span>
              {is_selected && (
                <span className="flex-none text-brand-500">
                  <CheckIcon size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {onCreateOption && (
        <div className="mt-1 flex items-center gap-1.5 border-t border-shell-border pt-2">
          <input
            value={new_label}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="Add an option"
            className="min-w-0 flex-1 rounded-md border border-shell-border-strong bg-shell-hover px-2 py-1.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!new_label.trim() || is_creating}
            aria-label="Add option"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      )}

      {!multi && selected_ids.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-md px-1.5 py-1.5 text-left text-[12.5px] text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-shell-text"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default OptionPicker;
