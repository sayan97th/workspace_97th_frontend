"use client";
import React from "react";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import ImportSelect, { type ImportSelectGroup, type ImportSelectOption } from "./ImportSelect";
import { ImportColumnIcon, PlusIcon } from "./importIcons";

export type ImportAddColumnButtonProps = {
  source_columns: BoardImportSourceColumn[];
  mappings: BoardImportMapping[];
  /** Fired with the picked file column. A column left out of the import is brought back, any other one is imported again as a copy. */
  onAdd: (source: BoardImportSourceColumn) => void;
};

/**
 * The dashed "Add column from file" row at the end of the "Map columns"
 * card. It lists every file column with what picking it does: bring back a
 * column that isn't imported, or import one again into another board column
 * (for example two "Feedback Description" columns, one Long text and one
 * Text). Reuses {@link ImportSelect} for its menu, search and keyboard.
 */
const ImportAddColumnButton: React.FC<ImportAddColumnButtonProps> = ({ source_columns, mappings, onAdd }) => {
  const optionFor = (source: BoardImportSourceColumn): ImportSelectOption => {
    const rows = mappings.filter((mapping) => mapping.source_index === source.index);
    const imported = rows.filter((mapping) => mapping.mode !== "skip");
    const is_name = rows.some((mapping) => mapping.mode === "name");
    const hint = imported.length === 0 ? "Not imported" : imported.length === 1 ? (is_name ? "Item name" : "Imported") : `Imported ${imported.length}x`;
    return { value: String(source.index), label: source.label, icon: <ImportColumnIcon type={source.suggested_type} />, hint };
  };

  // A file column whose own row was removed is brought back, any other one gets a copy.
  const not_imported = source_columns.filter((source) =>
    mappings.some((mapping) => mapping.source_index === source.index && !mapping.is_copy && mapping.mode === "skip")
  );
  const imported = source_columns.filter((source) => !not_imported.includes(source));
  const groups: ImportSelectGroup[] = (
    [
      { label: "Bring back", options: not_imported.map(optionFor) },
      { label: "Import again as a new column", options: imported.map(optionFor) },
    ] as ImportSelectGroup[]
  ).filter((group) => group.options.length > 0);

  return (
    <div className="iw-add-column">
      <ImportSelect
        value={null}
        groups={groups}
        onChange={(value) => {
          const source = source_columns.find((candidate) => candidate.index === Number(value));
          if (source) onAdd(source);
        }}
        display_label="Add column from file"
        display_icon={
          <span className="iw-add-column-icon">
            <PlusIcon size={12} />
          </span>
        }
        aria_label="Add column from file"
        className="iw-add-column-select"
        min_menu_width={300}
      />
      <span className="iw-add-column-hint">Import a file column again, for example as a second column with another type.</span>
    </div>
  );
};

export default ImportAddColumnButton;
