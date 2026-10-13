"use client";

import { COLUMN_TYPE_GALLERY, type ColumnTypeDef } from "../constants";
import ColumnTypeGallery from "./ColumnTypeGallery";
import PopoverPanel from "./PopoverPanel";

interface ColumnPickerProps {
  query: string;
  onQueryChange: (value: string) => void;
  onPick: (type: ColumnTypeDef) => void;
  onClose: () => void;
  align?: "left" | "right";
  /** Renders the gallery in place, without its own anchored popover, for a flyout that already places it (the column menu's "More columns"). */
  inline?: boolean;
}

/** The table's "+" column gallery, anchored under the header button, see `ColumnTypeGallery`. */
export default function ColumnPicker({ query, onQueryChange, onPick, onClose, align = "right", inline = false }: ColumnPickerProps) {
  const gallery = (
    <ColumnTypeGallery
      types={COLUMN_TYPE_GALLERY}
      query={query}
      onQueryChange={onQueryChange}
      onPick={(type) => {
        onPick(type);
        onClose();
      }}
      onClose={onClose}
      show_all={inline}
    />
  );
  if (inline) return gallery;
  return (
    <PopoverPanel unstyled onClose={onClose} className={`top-full mt-1 ${align === "right" ? "right-0" : "left-0"}`}>
      {gallery}
    </PopoverPanel>
  );
}
