"use client";
import React, { useMemo, useState } from "react";
import BoardPopover from "./toolbar/BoardPopover";
import { ADDABLE_COLUMN_TYPES, type AddableColumnType } from "./columnTypes";
import { COLUMN_TYPE_GALLERY, TABLE_KIND_TO_ENGINE_KIND } from "./table/constants";
import ColumnTypeGallery, { type ColumnTypeGalleryEntry } from "./table/menus/ColumnTypeGallery";
import type { ColumnKind } from "./table/types";

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

type AddColumnEntry = ColumnTypeGalleryEntry & { addable: AddableColumnType };

/** The engine's kind vocabulary ("long_text") back to the table gallery's ("longtext"), the reverse of `TABLE_KIND_TO_ENGINE_KIND`. */
const TABLE_KIND_BY_ENGINE_KIND = Object.fromEntries(
  Object.entries(TABLE_KIND_TO_ENGINE_KIND).map(([table_kind, engine_kind]) => [engine_kind, table_kind as ColumnKind])
) as Record<AddableColumnType["kind"], ColumnKind>;

/**
 * Turns the engine's column types into gallery entries. Section, order and icon
 * color come from the table gallery, so every "add column" picker in the app
 * groups and draws the types the same way.
 */
function toGalleryEntries(types: AddableColumnType[]): AddColumnEntry[] {
  const gallery_order = COLUMN_TYPE_GALLERY.map((type) => type.kind);
  return types
    .map((type) => {
      const kind = TABLE_KIND_BY_ENGINE_KIND[type.kind];
      const gallery_type = COLUMN_TYPE_GALLERY.find((entry) => entry.kind === kind);
      return {
        kind,
        label: type.label,
        description: type.description,
        accent: gallery_type?.accent ?? type.swatch.accent_color,
        section: gallery_type?.section ?? "More columns",
        addable: type,
      };
    })
    .sort((first, second) => gallery_order.indexOf(first.kind) - gallery_order.indexOf(second.kind));
}

/**
 * Monday-style "add a column" picker anchored under a button (the Kanban item
 * card's "Add field"), built on the shared {@link ColumnTypeGallery}. Purely
 * presentational, it reports the chosen {@link AddableColumnType} and lets the
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
  const entries = useMemo(() => toGalleryEntries(types), [types]);

  const handleSelect = (entry: AddColumnEntry) => {
    onSelectType(entry.addable);
    setQuery("");
    onClose();
  };

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={handleClose} align="start" width={360} unstyled>
      <ColumnTypeGallery types={entries} query={query} onQueryChange={setQuery} onPick={handleSelect} onClose={handleClose} />
    </BoardPopover>
  );
};

export default AddColumnMenu;
