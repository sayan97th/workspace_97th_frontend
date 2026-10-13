"use client";

import { useState } from "react";
import { COLUMN_TYPE_GALLERY, type ColumnTypeDef } from "../constants";
import ColumnCenterModal from "./ColumnCenterModal";
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

/**
 * The table's "+" column gallery, anchored under the header button, see
 * `ColumnTypeGallery`. Its "More columns" footer swaps the popover for the
 * full Column Center dialog, which closes the picker once a column is added.
 */
export default function ColumnPicker({ query, onQueryChange, onPick, onClose, align = "right", inline = false }: ColumnPickerProps) {
  const [is_center_open, setIsCenterOpen] = useState(false);

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
      onOpenColumnCenter={inline ? undefined : () => setIsCenterOpen(true)}
    />
  );
  if (inline) return gallery;
  if (is_center_open) return <ColumnCenterModal onAdd={(types) => types.forEach(onPick)} onClose={onClose} />;
  return (
    <PopoverPanel unstyled onClose={onClose} className={`top-full mt-1 ${align === "right" ? "right-0" : "left-0"}`}>
      {gallery}
    </PopoverPanel>
  );
}
