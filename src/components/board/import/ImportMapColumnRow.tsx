"use client";
import React from "react";
import ColumnSwatchBadge from "../toolbar/ColumnSwatchBadge";
import { COLUMN_KIND_SWATCH } from "../columnTypes";
import type { BoardColumnDto, BoardColumnType } from "@/types/board-content";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import { IMPORT_TYPE_LABELS, IMPORT_TYPE_NOTES, READ_ONLY_COLUMN_TYPES, betterFitTypes, isTypeCompatible } from "./importWizardUtils";

/** Encodes a mapping's mode+target into one `<select>` value. */
export function destinationValue(mapping: BoardImportMapping): string {
  if (mapping.mode === "map") return `map:${mapping.target_column_id ?? ""}`;
  return mapping.mode;
}

/**
 * The destination a row is actually writing into, or null when it isn't
 * writing into a typed column at all ("Item (name)" / "Don't import").
 */
export function destinationType(
  mapping: BoardImportMapping,
  source: BoardImportSourceColumn,
  board_columns: BoardColumnDto[]
): BoardColumnType | null {
  if (mapping.mode === "create") return mapping.new_type ?? source.suggested_type;
  if (mapping.mode === "map") return board_columns.find((column) => column.id === mapping.target_column_id)?.type ?? null;
  return null;
}

/** True when a row's destination can't hold every value it has. Read by the "Needs review" filter and the amber caption alike. */
export function mappingNeedsReview(mapping: BoardImportMapping, source: BoardImportSourceColumn, board_columns: BoardColumnDto[]): boolean {
  const type = destinationType(mapping, source, board_columns);
  return type !== null && source.filled_count > 0 && !isTypeCompatible(source, type);
}

const select_class =
  "w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-2 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500 disabled:cursor-default disabled:opacity-60";

const input_class =
  "rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-1.5 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500";

/**
 * The line under a "+ Create new column" row: which type the backend
 * detected and why (e.g. "Date · 100% of values are dates"), or, once the
 * user picks a different type, that override alongside the original guess,
 * so it's always clear whether a type came from the data or from a person.
 */
const CreateColumnCaption: React.FC<{
  chosen_type: BoardColumnType;
  suggested_type: BoardColumnType;
  detection_reason: string;
}> = ({ chosen_type, suggested_type, detection_reason }) => {
  const is_overridden = chosen_type !== suggested_type;

  return (
    <span className="pl-0.5 text-[11px] leading-snug text-shell-text-muted" title={detection_reason}>
      {is_overridden ? (
        <>
          New {IMPORT_TYPE_LABELS[chosen_type]} column · detected as {IMPORT_TYPE_LABELS[suggested_type]}
        </>
      ) : (
        <>
          New <span className="font-semibold text-shell-text-secondary">{IMPORT_TYPE_LABELS[chosen_type]}</span> column · {detection_reason}
        </>
      )}
    </span>
  );
};

export type ImportMapColumnRowProps = {
  source: BoardImportSourceColumn;
  mapping: BoardImportMapping;
  /** What the backend pre-filled for this row, to tell an automatic match apart from a hand-picked one. */
  suggested_mapping: BoardImportMapping | undefined;
  row_count: number;
  board_columns: BoardColumnDto[];
  creatable_column_types: BoardColumnType[];
  onChangeDestination: (value: string) => void;
  onChangeMapping: (patch: Partial<BoardImportMapping>) => void;
};

/**
 * One row of the "Map columns" step: the file's column (label, a peek at its
 * values, how full it is and, for a merged Timeline/checklist column, which
 * of the file's columns it was built from) on the left, and where it lands
 * on the right. Under the destination it spells out why that choice was
 * made, how the values will be stored for the less obvious types, and a
 * warning whenever the destination type can't hold every value.
 */
const ImportMapColumnRow: React.FC<ImportMapColumnRowProps> = ({
  source,
  mapping,
  suggested_mapping,
  row_count,
  board_columns,
  creatable_column_types,
  onChangeDestination,
  onChangeMapping,
}) => {
  const target_column = mapping.mode === "map" ? board_columns.find((column) => column.id === mapping.target_column_id) : undefined;
  const type = destinationType(mapping, source, board_columns);
  const needs_review = mappingNeedsReview(mapping, source, board_columns);
  const is_empty = source.filled_count === 0;
  const is_auto_matched =
    mapping.mode === "map" && suggested_mapping?.mode === "map" && suggested_mapping.target_column_id === mapping.target_column_id;

  const recommended_types = creatable_column_types.filter((candidate) => isTypeCompatible(source, candidate));
  const other_types = creatable_column_types.filter((candidate) => !isTypeCompatible(source, candidate));
  const better_fits = betterFitTypes(source, creatable_column_types);
  const type_note = type ? IMPORT_TYPE_NOTES[type] : undefined;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-4 gap-y-2 py-3">
      <div className="flex flex-col gap-0.5 overflow-hidden pt-1.5">
        <span className="truncate text-[13.5px] font-medium text-shell-text">{source.label}</span>
        {source.combined_from.length > 0 && (
          <span className="truncate text-[11px] text-brand-500" title={source.combined_from.join(" + ")}>
            Merged from {source.combined_from.length} columns: {source.combined_from.join(" + ")}
          </span>
        )}
        {source.sample_values.length > 0 && (
          <span className="truncate text-[12px] text-shell-text-muted" title={source.sample_values.join(", ")}>
            {source.sample_values.join(", ")}
          </span>
        )}
        <span className={`text-[11px] ${is_empty ? "text-warning-600" : "text-shell-text-muted"}`}>
          {is_empty ? "Empty in this file" : `${source.filled_count} of ${row_count} row${row_count === 1 ? "" : "s"} filled`}
        </span>
      </div>

      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-2.5 text-shell-text-muted">
        <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          {mapping.mode === "name" && <ColumnSwatchBadge swatch={{ accent_color: "#fdab3d", glyph: "T", glyph_text_color: "#3a2a00" }} />}
          {type && <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[type]} />}

          <select value={destinationValue(mapping)} onChange={(event) => onChangeDestination(event.target.value)} className={select_class}>
            <option value="skip">Don&apos;t import</option>
            <option value="name">Item (name)</option>
            {board_columns.length > 0 && (
              <optgroup label="Existing columns">
                {board_columns.map((column) => {
                  const is_read_only = READ_ONLY_COLUMN_TYPES.includes(column.type);
                  return (
                    <option key={column.id} value={`map:${column.id}`} disabled={is_read_only}>
                      {column.label} ({IMPORT_TYPE_LABELS[column.type]}
                      {is_read_only ? ", read-only" : ""})
                    </option>
                  );
                })}
              </optgroup>
            )}
            <option value="create">+ Create new column</option>
          </select>
        </div>

        {mapping.mode === "name" && <span className="pl-0.5 text-[11px] text-shell-text-muted">Each row&apos;s value becomes the item&apos;s name</span>}
        {mapping.mode === "map" && target_column && (
          <span className="pl-0.5 text-[11px] text-shell-text-muted">
            {is_auto_matched ? "Auto-matched by name to" : "Existing"}{" "}
            <span className="font-semibold text-shell-text-secondary">{IMPORT_TYPE_LABELS[target_column.type]}</span> column
          </span>
        )}
        {mapping.mode === "create" && (
          <CreateColumnCaption
            chosen_type={mapping.new_type ?? source.suggested_type}
            suggested_type={source.suggested_type}
            detection_reason={source.detection_reason}
          />
        )}
        {needs_review && type && (
          <span className="flex items-start gap-1 pl-0.5 text-[11px] leading-snug text-warning-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="mt-px flex-none">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Some values don&apos;t look like {IMPORT_TYPE_LABELS[type]} values and will be left empty.
            {better_fits.length > 0 && ` Better fits: ${better_fits.map((candidate) => IMPORT_TYPE_LABELS[candidate]).join(", ")}.`}
          </span>
        )}
        {type_note && mapping.mode !== "skip" && <span className="pl-0.5 text-[11px] leading-snug text-shell-text-muted">{type_note}</span>}
      </div>

      {mapping.mode === "create" && (
        <div className="col-span-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={mapping.new_label ?? ""}
            onChange={(event) => onChangeMapping({ new_label: event.target.value })}
            placeholder="Column name"
            maxLength={255}
            aria-label={`New column name for ${source.label}`}
            className={`w-[220px] ${input_class}`}
          />
          <select
            value={mapping.new_type ?? source.suggested_type}
            onChange={(event) => onChangeMapping({ new_type: event.target.value as BoardColumnType })}
            aria-label={`New column type for ${source.label}`}
            className={input_class}
          >
            {recommended_types.length > 0 && (
              <optgroup label="Fits this column's values">
                {recommended_types.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {IMPORT_TYPE_LABELS[candidate]}
                    {candidate === source.suggested_type ? " (detected)" : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {other_types.length > 0 && (
              <optgroup label="Other types (some values may be left empty)">
                {other_types.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {IMPORT_TYPE_LABELS[candidate]}
                    {candidate === source.suggested_type ? " (detected)" : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}
    </div>
  );
};

export default ImportMapColumnRow;
