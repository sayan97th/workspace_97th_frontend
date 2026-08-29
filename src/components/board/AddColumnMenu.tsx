"use client";
import React, { useMemo, useState } from "react";
import SearchField from "@/components/common/SearchField";
import BoardPopover from "./toolbar/BoardPopover";
import ColumnSwatchBadge from "./toolbar/ColumnSwatchBadge";
import {
  ADDABLE_COLUMN_TYPES,
  COLUMN_TYPE_SECTIONS,
  type AddableColumnType,
} from "./columnTypes";

export type AddColumnMenuProps = {
  /** The "+" header button the menu is anchored beneath. */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Fired with the chosen type; the caller creates the column. The menu closes itself first. */
  onSelectType: (type: AddableColumnType) => void;
  /** Override the offered types (defaults to {@link ADDABLE_COLUMN_TYPES}). */
  types?: AddableColumnType[];
};

/**
 * Monday-style "add a column" picker: a searchable, sectioned grid of column
 * data-types shown when the trailing "+" header button is clicked. Purely
 * presentational — it reports the chosen {@link AddableColumnType} and lets the
 * consumer own creation, so any board view can reuse it.
 */
const AddColumnMenu: React.FC<AddColumnMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  onSelectType,
  types = ADDABLE_COLUMN_TYPES,
}) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return types;
    return types.filter(
      (type) =>
        type.label.toLowerCase().includes(term) || type.description.toLowerCase().includes(term)
    );
  }, [types, query]);

  const handleSelect = (type: AddableColumnType) => {
    onSelectType(type);
    setQuery("");
    onClose();
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={handleClose} align="start" width={380}>
      <div className="flex flex-col gap-3 p-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search or describe your column"
          autoFocus
        />

        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-[13px] text-boardtree-text-faint">
            No column types match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          COLUMN_TYPE_SECTIONS.map((section) => {
            const section_types = filtered.filter((type) => type.section === section.id);
            if (section_types.length === 0) return null;
            return (
              <div key={section.id} className="flex flex-col gap-1.5">
                <span className="px-1 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
                  {section.label}
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {section_types.map((type) => (
                    <button
                      key={type.kind + type.label}
                      type="button"
                      aria-label={type.label}
                      title={type.description}
                      onClick={() => handleSelect(type)}
                      className="flex items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors hover:bg-boardtree-hover"
                    >
                      <ColumnSwatchBadge swatch={type.swatch} size={22} />
                      <span className="truncate text-[13px] font-medium text-boardtree-text">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </BoardPopover>
  );
};

export default AddColumnMenu;
