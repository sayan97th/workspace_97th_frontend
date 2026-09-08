"use client";
import React from "react";
import ColumnSwatchBadge from "../toolbar/ColumnSwatchBadge";
import { COLUMN_KIND_SWATCH } from "../columnTypes";
import type { BoardColumnDto, BoardColumnType, BoardGroupDto } from "@/types/board-content";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";

/** "Create a new column" mapping mode offers a curated subset of real types — see `creatable_column_types` from the analyze response. */
const TYPE_LABELS: Record<BoardColumnType, string> = {
  text: "Text",
  long_text: "Long text",
  status: "Status",
  label: "Label",
  people: "People",
  date: "Date",
  tags: "Tags",
  dropdown: "Dropdown",
  number: "Numbers",
  checkbox: "Checkbox",
  progress: "Progress",
  phone: "Phone",
  email: "Email",
  timeline: "Timeline",
  dependency: "Dependency",
};

const NEW_GROUP_VALUE = "__new__";

export type ImportMapColumnsStepProps = {
  file_name: string;
  row_count: number;
  source_columns: BoardImportSourceColumn[];
  board_columns: BoardColumnDto[];
  groups: BoardGroupDto[];
  creatable_column_types: BoardColumnType[];
  mappings: BoardImportMapping[];
  onChangeMappings: (mappings: BoardImportMapping[]) => void;
  target_group_id: number | null;
  onChangeTargetGroupId: (group_id: number | null) => void;
  new_group_name: string;
  onChangeNewGroupName: (name: string) => void;
  error: string | null;
};

/** Encodes a mapping's mode+target into one `<select>` value. */
function optionValue(mapping: BoardImportMapping): string {
  if (mapping.mode === "map") return `map:${mapping.target_column_id ?? ""}`;
  return mapping.mode;
}

const select_class =
  "w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-2 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500 disabled:cursor-default disabled:opacity-60";

/**
 * Step 2 ("Map columns") — one row per column the uploaded file actually
 * has, each with a single destination picker: the item's own name, an
 * existing board column, a freshly-created one, or "Don't import". Also owns
 * the "Add items to" table picker above the list, mirroring the approved
 * design's header row.
 *
 * Every row arrives already auto-mapped by the backend's `suggestMappings()`
 * — an exact label match onto an existing board column, or (failing that) a
 * brand-new column typed from the uploaded values themselves — so the user
 * never has to hand-pick a destination for every column; the caption under
 * each select just makes that automatic choice visible, and any row can
 * still be overridden or set to "Don't import".
 */
const ImportMapColumnsStep: React.FC<ImportMapColumnsStepProps> = ({
  file_name,
  row_count,
  source_columns,
  board_columns,
  groups,
  creatable_column_types,
  mappings,
  onChangeMappings,
  target_group_id,
  onChangeTargetGroupId,
  new_group_name,
  onChangeNewGroupName,
  error,
}) => {
  const updateMapping = (source_index: number, patch: Partial<BoardImportMapping>) => {
    onChangeMappings(
      mappings.map((mapping) => (mapping.source_index === source_index ? { ...mapping, ...patch } : mapping))
    );
  };

  const handleSelectChange = (source_index: number, source_label: string, suggested_type: BoardColumnType, value: string) => {
    if (value === "name") {
      // Only one column can feed the item's own name — reassigning it here
      // demotes whichever column held it before back to unmapped.
      onChangeMappings(
        mappings.map((mapping) => {
          if (mapping.source_index === source_index) return { ...mapping, mode: "name", target_column_id: null };
          if (mapping.mode === "name") return { ...mapping, mode: "skip" };
          return mapping;
        })
      );
      return;
    }

    if (value === "skip") {
      updateMapping(source_index, { mode: "skip", target_column_id: null });
      return;
    }

    if (value === "create") {
      updateMapping(source_index, {
        mode: "create",
        target_column_id: null,
        new_label: source_label,
        new_type: suggested_type,
      });
      return;
    }

    const target_column_id = Number(value.slice("map:".length));
    updateMapping(source_index, { mode: "map", target_column_id });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-shell-border px-7 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-shell-text-secondary">Add items to</span>
          <select
            value={target_group_id ?? NEW_GROUP_VALUE}
            onChange={(event) => onChangeTargetGroupId(event.target.value === NEW_GROUP_VALUE ? null : Number(event.target.value))}
            className="rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-1.5 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500"
          >
            <option value={NEW_GROUP_VALUE}>New table</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          {target_group_id === null && (
            <input
              type="text"
              value={new_group_name}
              onChange={(event) => onChangeNewGroupName(event.target.value)}
              placeholder="Table name"
              maxLength={255}
              className="w-[180px] rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-1.5 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500"
            />
          )}
        </div>

        <span className="text-[12.5px] text-shell-text-muted">
          {file_name} · {row_count} row{row_count === 1 ? "" : "s"}
        </span>

        {error && <span className="text-[12.5px] text-error-500">{error}</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-1 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-muted">
          <span>{file_name}</span>
          <span />
          <span>Board columns</span>
        </div>

        <div className="flex flex-col divide-y divide-shell-border">
          {source_columns.map((source) => {
            const mapping = mappings.find((m) => m.source_index === source.index);
            if (!mapping) return null;

            return (
              <div key={source.index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 py-3">
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="truncate text-[13.5px] font-medium text-shell-text">{source.label}</span>
                  {source.sample_values.length > 0 && (
                    <span className="truncate text-[12px] text-shell-text-muted">{source.sample_values.join(", ")}</span>
                  )}
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-shell-text-muted">
                  <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {mapping.mode === "name" && <ColumnSwatchBadge swatch={{ accent_color: "#fdab3d", glyph: "T", glyph_text_color: "#3a2a00" }} />}
                    {mapping.mode === "map" && mapping.target_column_id != null && (
                      <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[board_columns.find((c) => c.id === mapping.target_column_id)?.type ?? "text"]} />
                    )}
                    {mapping.mode === "create" && <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[mapping.new_type ?? source.suggested_type]} />}

                    <select
                      value={optionValue(mapping)}
                      onChange={(event) => handleSelectChange(source.index, source.label, source.suggested_type, event.target.value)}
                      className={select_class}
                    >
                      <option value="skip">Don&apos;t import</option>
                      <option value="name">Item (name)</option>
                      {board_columns.length > 0 && (
                        <optgroup label="Existing columns">
                          {board_columns.map((column) => (
                            <option key={column.id} value={`map:${column.id}`}>
                              {column.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="create">+ Create new column</option>
                    </select>
                  </div>

                  {mapping.mode === "map" && (
                    <span className="pl-0.5 text-[11px] text-shell-text-muted">Auto-matched to an existing column</span>
                  )}
                  {mapping.mode === "create" && (
                    <span className="pl-0.5 text-[11px] text-shell-text-muted">
                      Auto-detected as {TYPE_LABELS[mapping.new_type ?? source.suggested_type]} — a new column will be created
                    </span>
                  )}
                </div>

                {mapping.mode === "create" && (
                  <div className="col-span-3 -mt-1 flex items-center gap-2 pl-0">
                    <input
                      type="text"
                      value={mapping.new_label ?? ""}
                      onChange={(event) => updateMapping(source.index, { new_label: event.target.value })}
                      placeholder="Column name"
                      maxLength={255}
                      className="w-[220px] rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-1.5 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500"
                    />
                    <select
                      value={mapping.new_type ?? source.suggested_type}
                      onChange={(event) => updateMapping(source.index, { new_type: event.target.value as BoardColumnType })}
                      className="rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-1.5 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500"
                    >
                      {creatable_column_types.map((type) => (
                        <option key={type} value={type}>
                          {TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ImportMapColumnsStep;
