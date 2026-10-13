"use client";

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { CheckIcon, EditPencilIcon, PlusIcon } from "@/icons/board-icons";
import { DeleteIcon, SearchIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { boardTreeFontClassName } from "../../board-tree-font";
import EditLabelsPanel, { type BoardOptionActions } from "../../cells/EditLabelsPanel";
import { STATUS_PALETTE } from "../constants";
import type { StatusDef } from "../types";
import PopoverPanel from "./PopoverPanel";
import "../../cells/status-label-picker.css";
import "./label-picker.css";

interface LabelMenuProps {
  label_defs: StatusDef[];
  /** The cell's current label id, or null when it has none. */
  selected_id: string | null;
  onPick: (id: string) => void;
  /** Empties the cell. */
  onClear: () => void;
  onClose: () => void;
  /** "+ Create" while picking: adds the label to the column and sets it on this cell. Omit to hide the row. */
  onCreateAndSelect?: (option: { label: string; color: string }) => void;
  /** Rename, recolor, delete, deactivate, describe and reorder for "Edit labels". Omit to hide the footer button. */
  option_actions?: BoardOptionActions;
  /** "+ New label" inside "Edit labels": only adds the label to the column. */
  onAddOption?: (option: { label: string; color: string }) => void;
  /** Labels set on at least one loaded item, which can't be deleted, only deactivated. */
  used_option_ids?: ReadonlySet<string>;
}

/** Sets the tint of a {@link LabelPill}, see `label-picker.css`. */
export const labelPillStyle = (color: string) => ({ "--label-pill-color": color || "#9699a6" }) as CSSProperties;

/** The Label column's tinted pill, shared by the table cell and the picker rows. */
export function LabelPill({ label, color, is_inactive = false }: { label: string; color: string; is_inactive?: boolean }) {
  return (
    <span className="label-pill" style={labelPillStyle(color)} data-inactive={is_inactive || undefined}>
      <span className="label-pill__text">{label}</span>
    </span>
  );
}

const normalize = (value: string) => value.trim().toLocaleLowerCase();

/**
 * The table's Label cell picker, monday style. A "Search or create a label"
 * field filters the column's labels, shown as tinted pills with a check on the
 * one set on the cell. While the typed name is new a "+ Create" row adds it and
 * sets it right away. The footer holds "Edit labels", which swaps the card for
 * the shared {@link EditLabelsPanel} (drag to reorder, recolor, rename,
 * describe, deactivate, delete), and a "Clear" icon with its tooltip.
 * Picking a label saves it and closes the picker. Styles live in `label-picker.css`.
 */
export default function LabelMenu({
  label_defs,
  selected_id,
  onPick,
  onClear,
  onClose,
  onCreateAndSelect,
  option_actions,
  onAddOption,
  used_option_ids,
}: LabelMenuProps) {
  const [query, setQuery] = useState("");
  const [is_editing, setIsEditing] = useState(false);
  const [highlighted_index, setHighlightedIndex] = useState(-1);

  const labeled_defs = useMemo(() => label_defs.filter((def) => !def.fixed && def.label), [label_defs]);
  const normalized_query = normalize(query);
  // Deactivated labels drop out of the list, unless the cell is already set to one.
  const pick_options = labeled_defs.filter(
    (def) => (def.is_active !== false || def.id === selected_id) && normalize(def.label).includes(normalized_query)
  );
  const has_exact_match = labeled_defs.some((def) => normalize(def.label) === normalized_query);
  const can_create = onCreateAndSelect !== undefined && normalized_query !== "" && !has_exact_match;
  const next_color = STATUS_PALETTE[labeled_defs.length % STATUS_PALETTE.length];
  // The "+ Create" row joins the keyboard list right after the labels.
  const row_count = pick_options.length + (can_create ? 1 : 0);

  const updateQuery = (value: string) => {
    setQuery(value);
    setHighlightedIndex(value.trim() ? 0 : -1);
  };

  const pickLabel = (id: string) => {
    onPick(id);
    onClose();
  };

  const createLabel = () => {
    const label = query.trim();
    if (!label || !can_create) return;
    onCreateAndSelect?.({ label, color: next_color });
    onClose();
  };

  const clearLabel = () => {
    onClear();
    onClose();
  };

  // Arrows move through the list, Enter picks the highlighted row, Escape closes the picker.
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (row_count === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const start_index = highlighted_index < 0 ? (step === 1 ? -1 : 0) : highlighted_index;
      setHighlightedIndex((start_index + step + row_count) % row_count);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const highlighted = pick_options[highlighted_index];
      if (highlighted) pickLabel(highlighted.id);
      else if (can_create) createLabel();
    }
  };

  if (is_editing && option_actions) {
    return (
      <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
        <div className={`status-picker status-picker--card ${boardTreeFontClassName}`}>
          <EditLabelsPanel
            options={labeled_defs}
            actions={option_actions}
            onCreateOption={
              onAddOption
                ? async (option) => {
                    onAddOption(option);
                    return null;
                  }
                : undefined
            }
            used_option_ids={used_option_ids}
            onDone={() => setIsEditing(false)}
          />
        </div>
      </PopoverPanel>
    );
  }

  const empty_message =
    labeled_defs.length === 0
      ? onCreateAndSelect
        ? "No labels yet. Type a name to create the first one."
        : "No labels yet."
      : "No labels match your search.";

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div className={`label-picker ${boardTreeFontClassName}`}>
        <div className="label-picker__search">
          <span className="label-picker__search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={onCreateAndSelect ? "Search or create a label" : "Search labels"}
            aria-label={onCreateAndSelect ? "Search or create a label" : "Search labels"}
            className="label-picker__search-input"
          />
        </div>

        <div className="label-picker__list" role="listbox" aria-label="Labels">
          {pick_options.map((def, index) => (
            <button
              type="button"
              key={def.id}
              role="option"
              aria-selected={def.id === selected_id}
              data-highlighted={index === highlighted_index || undefined}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => pickLabel(def.id)}
              title={def.description || def.label}
              className="label-picker__option"
            >
              <LabelPill label={def.label} color={def.color} is_inactive={def.is_active === false} />
              {def.id === selected_id && (
                <span className="label-picker__check" aria-hidden="true">
                  <CheckIcon size={14} />
                </span>
              )}
            </button>
          ))}

          {can_create && (
            <button
              type="button"
              onClick={createLabel}
              onMouseEnter={() => setHighlightedIndex(pick_options.length)}
              data-highlighted={highlighted_index === pick_options.length || undefined}
              className="label-picker__create"
            >
              <span className="label-picker__create-icon" aria-hidden="true">
                <PlusIcon size={14} />
              </span>
              <span className="label-picker__create-text">Create</span>
              <LabelPill label={query.trim()} color={next_color} />
            </button>
          )}

          {row_count === 0 && <div className="label-picker__empty">{empty_message}</div>}
        </div>

        {(option_actions || selected_id) && (
          <div className="label-picker__footer">
            {option_actions ? (
              <button type="button" onClick={() => setIsEditing(true)} className="label-picker__footer-button">
                <EditPencilIcon size={16} />
                Edit labels
              </button>
            ) : (
              <span />
            )}
            {selected_id && (
              <Tooltip content="Clear label" placement="left">
                <button type="button" onClick={clearLabel} aria-label="Clear label" className="label-picker__clear">
                  <DeleteIcon size={16} />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </PopoverPanel>
  );
}
