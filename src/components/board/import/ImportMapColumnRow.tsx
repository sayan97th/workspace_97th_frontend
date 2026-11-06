"use client";
import React, { useEffect, useRef, useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardColumnDto, BoardColumnType } from "@/types/board-content";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import ImportAssetStrip from "./ImportAssetStrip";
import ImportOptionChips from "./ImportOptionChips";
import ImportSelect, { type ImportSelectGroup } from "./ImportSelect";
import { ArrowRightIcon, CopyIcon, ImportColumnIcon, PlusIcon, TrashIcon, WarningIcon } from "./importIcons";
import { IMPORT_TYPE_LABELS, IMPORT_TYPE_NOTES, READ_ONLY_COLUMN_TYPES, betterFitTypes, isTypeCompatible } from "./importWizardUtils";

/** Encodes a mapping's mode+target into one picker value. */
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

/** Names under a People (or Vote) destination that match no workspace user, and would be left out. */
export function unmatchedPeople(type: BoardColumnType | null, source: BoardImportSourceColumn): string[] {
  if ((type !== "people" && type !== "vote") || !source.people_match) return [];
  return source.people_match.unmatched;
}

/**
 * True when a row's destination can't hold every value it has: values of the
 * wrong shape, embedded files outside a Files column, or names that match no
 * user. Read by the "Needs review" filter and the amber caption alike.
 */
export function mappingNeedsReview(mapping: BoardImportMapping, source: BoardImportSourceColumn, board_columns: BoardColumnDto[]): boolean {
  const type = destinationType(mapping, source, board_columns);
  if (type === null || source.filled_count === 0) return false;
  return !isTypeCompatible(source, type) || unmatchedPeople(type, source).length > 0;
}

/** The sentence explaining what a flagged row loses, the more specific reason first. */
function reviewMessage(type: BoardColumnType, source: BoardImportSourceColumn, better_fits: BoardColumnType[]): string {
  const file_count = source.assets?.file_count ?? 0;
  if (file_count > 0 && type !== "files") {
    return `${file_count} embedded file${file_count === 1 ? "" : "s"} only import into a Files column, they will be left out here.`;
  }
  if (type === "files") {
    return "Text without a link can't be kept in a Files column and will be left out. Embedded files and links are imported.";
  }
  const unmatched = unmatchedPeople(type, source);
  if (unmatched.length > 0 && isTypeCompatible(source, type)) {
    const more = (source.people_match?.total_count ?? 0) - (source.people_match?.matched_count ?? 0) - unmatched.length;
    return `No workspace user matches ${unmatched.join(", ")}${more > 0 ? ` and ${more} more` : ""}, so they will be left empty. A Text or Status column keeps every name.`;
  }
  const fits = better_fits.length > 0 ? ` Better fits: ${better_fits.map((candidate) => IMPORT_TYPE_LABELS[candidate]).join(", ")}.` : "";
  return `Some values don't fit a ${IMPORT_TYPE_LABELS[type]} column and will be left empty.${fits}`;
}

export type ImportMapColumnRowProps = {
  source: BoardImportSourceColumn;
  mapping: BoardImportMapping;
  /** What the backend pre-filled for this row, to tell an automatic match apart from a hand-picked one. */
  suggested_mapping: BoardImportMapping | undefined;
  row_count: number;
  board_columns: BoardColumnDto[];
  creatable_column_types: BoardColumnType[];
  /** Board columns another row already writes into, offered but disabled here. */
  used_column_ids: Set<number>;
  onChangeDestination: (value: string) => void;
  onChangeMapping: (patch: Partial<BoardImportMapping>) => void;
  /** Adds another row importing this same file column, right below this one. */
  onDuplicate: () => void;
  /** Leaves the column out of the import (a copy is deleted outright). */
  onRemove: () => void;
  /** True right after the row was added, it scrolls into view, flashes and opens its settings. */
  is_fresh?: boolean;
};

/**
 * One row of the "Map columns" card, laid out like monday.com's: the file's
 * column on the left (with a peek at its values and how full it is), an
 * arrow, and the board column it lands in on the right. A row left at
 * "Select column" isn't imported. Under the picker it says why a destination
 * was chosen, how the less obvious types store their values, and warns
 * whenever the destination can't hold every value. A "+ Create new column"
 * row opens a settings line for the new column's name and type. Hovering
 * the row shows "Duplicate" (import the column again) and "Remove" (leave it
 * out, or delete it when the row is a copy).
 */
const ImportMapColumnRow: React.FC<ImportMapColumnRowProps> = ({
  source,
  mapping,
  suggested_mapping,
  row_count,
  board_columns,
  creatable_column_types,
  used_column_ids,
  onChangeDestination,
  onChangeMapping,
  onDuplicate,
  onRemove,
  is_fresh = false,
}) => {
  const row_ref = useRef<HTMLDivElement>(null);
  const is_copy = mapping.is_copy === true;
  const target_column = mapping.mode === "map" ? board_columns.find((column) => column.id === mapping.target_column_id) : undefined;
  const type = destinationType(mapping, source, board_columns);
  const needs_review = mappingNeedsReview(mapping, source, board_columns);
  const is_empty = source.filled_count === 0;
  const is_auto_matched =
    mapping.mode === "map" && suggested_mapping?.mode === "map" && suggested_mapping.target_column_id === mapping.target_column_id;
  const [is_settings_open, setIsSettingsOpen] = useState(is_fresh && mapping.mode === "create");

  useEffect(() => {
    if (!is_fresh) return;
    row_ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [is_fresh]);
  const new_type = mapping.new_type ?? source.suggested_type;
  // A Files row with embedded files already says they are uploaded in its detection reason.
  const type_note = type && !(type === "files" && source.assets) ? IMPORT_TYPE_NOTES[type] : undefined;
  const better_fits = betterFitTypes(source, creatable_column_types);

  const destination_groups = (
    [
    {
      label: board_columns.length > 0 ? "Board columns" : undefined,
      options: board_columns.map((column) => {
        const is_read_only = READ_ONLY_COLUMN_TYPES.includes(column.type);
        const is_taken = used_column_ids.has(column.id) && column.id !== mapping.target_column_id;
        return {
          value: `map:${column.id}`,
          label: column.label,
          icon: <ImportColumnIcon type={column.type} />,
          hint: IMPORT_TYPE_LABELS[column.type],
          is_disabled: is_read_only || is_taken,
          disabled_reason: is_read_only
            ? "The board computes this column, so it can't hold imported values"
            : is_taken
              ? "Another file column is already mapped to this column"
              : undefined,
        };
      }),
    },
    {
      options: [
        {
          value: "create",
          label: "Create new column",
          icon: (
            <span className="iw-plus-icon">
              <PlusIcon size={12} />
            </span>
          ),
          hint: IMPORT_TYPE_LABELS[creatable_column_types.includes(source.suggested_type) ? source.suggested_type : "text"],
          tone: "action",
        },
      ],
    },
    ] as ImportSelectGroup[]
  ).filter((group) => group.options.length > 0);

  const type_groups = (
    [
    {
      label: "Fits this column's values",
      options: creatable_column_types
        .filter((candidate) => isTypeCompatible(source, candidate))
        .map((candidate) => ({
          value: candidate,
          label: IMPORT_TYPE_LABELS[candidate],
          icon: <ImportColumnIcon type={candidate} />,
          hint: candidate === source.suggested_type ? "Detected" : undefined,
        })),
    },
    {
      label: "Other types, some values may be left empty",
      options: creatable_column_types
        .filter((candidate) => !isTypeCompatible(source, candidate))
        .map((candidate) => ({ value: candidate, label: IMPORT_TYPE_LABELS[candidate], icon: <ImportColumnIcon type={candidate} /> })),
    },
    ] as ImportSelectGroup[]
  ).filter((group) => group.options.length > 0);

  const sample_text = source.sample_values.join(", ");
  const option_count = source.declared_options.length;
  const shows_options = option_count > 0 && (type === "status" || type === "label" || type === "dropdown" || type === null);

  return (
    <div ref={row_ref} className="iw-row iw-row-grid" data-review={needs_review} data-copy={is_copy} data-fresh={is_fresh}>
      <div className="iw-row-source">
        <div className="iw-row-head">
          <span className="iw-row-label" title={source.label}>
            {source.label}
          </span>
          {is_copy && (
            <span className="iw-row-badge">
              <CopyIcon size={11} />
              Copy
            </span>
          )}
          <div className="iw-row-actions">
            <PortalTooltip content="Import this column again into another board column">
              <button type="button" className="iw-row-action" aria-label={`Duplicate ${source.label}`} onClick={onDuplicate}>
                <CopyIcon size={14} />
              </button>
            </PortalTooltip>
            <PortalTooltip content={is_copy ? "Remove this copy" : "Don't import this column"}>
              <button
                type="button"
                className="iw-row-action"
                data-tone="danger"
                aria-label={is_copy ? `Remove copy of ${source.label}` : `Don't import ${source.label}`}
                onClick={onRemove}
              >
                <TrashIcon size={14} />
              </button>
            </PortalTooltip>
          </div>
        </div>
        {source.assets ? (
          <ImportAssetStrip assets={source.assets} />
        ) : shows_options ? (
          <ImportOptionChips options={source.declared_options} variant={type === "dropdown" ? "dropdown" : "status"} />
        ) : source.combined_from.length > 0 ? (
          <span className="iw-row-meta" data-tone="info" title={source.combined_from.join(" + ")}>
            Merged from {source.combined_from.join(" + ")}
          </span>
        ) : (
          sample_text && (
            <span className="iw-row-meta" title={sample_text}>
              {sample_text}
            </span>
          )
        )}
        <span className="iw-row-meta" data-tone={is_empty ? "warning" : undefined}>
          {is_empty ? "Empty in this file" : `${source.filled_count} of ${row_count} row${row_count === 1 ? "" : "s"} filled`}
        </span>
      </div>

      <span className="iw-row-arrow" aria-hidden="true">
        <ArrowRightIcon size={18} />
      </span>

      <div className="iw-row-target">
        <ImportSelect
          value={mapping.mode === "map" || mapping.mode === "create" ? destinationValue(mapping) : null}
          groups={destination_groups}
          onChange={onChangeDestination}
          onClear={onRemove}
          aria_label={`Board column for ${source.label}`}
          display_label={mapping.mode === "create" ? `New: ${mapping.new_label || source.label}` : undefined}
          display_icon={mapping.mode === "create" ? <ImportColumnIcon type={new_type} /> : undefined}
          is_invalid={mapping.mode === "map" && !target_column}
          min_menu_width={260}
        />

        {mapping.mode === "map" && target_column && is_auto_matched && <span className="iw-row-note">Matched by name</span>}
        {mapping.mode === "create" && (
          <span className="iw-row-note" title={source.detection_reason}>
            {new_type === source.suggested_type ? source.detection_reason : `Detected as ${IMPORT_TYPE_LABELS[source.suggested_type]}`}
            {" · "}
            <button type="button" className="iw-link" aria-expanded={is_settings_open} onClick={() => setIsSettingsOpen((current) => !current)}>
              {is_settings_open ? "Hide settings" : "Edit name and type"}
            </button>
          </span>
        )}
        {needs_review && type && (
          <span className="iw-row-note" data-tone="warning">
            <WarningIcon size={12} />
            <span>{reviewMessage(type, source, better_fits)}</span>
          </span>
        )}
        {mapping.mode === "create" && option_count > 0 && (type === "status" || type === "label" || type === "dropdown") ? (
          <span className="iw-row-note">
            Starts with all {option_count} options of the file&apos;s list{source.option_preset === "priority" ? ", in the Priority colors" : ""}.
          </span>
        ) : (
          type_note && <span className="iw-row-note">{type_note}</span>
        )}
      </div>

      {mapping.mode === "create" && is_settings_open && (
        <div className="iw-row-create">
          <label>
            Column name
            <input
              type="text"
              className="iw-input"
              value={mapping.new_label ?? ""}
              onChange={(event) => onChangeMapping({ new_label: event.target.value })}
              placeholder={source.label}
              maxLength={255}
            />
          </label>
          <label>
            Type
            <ImportSelect
              value={new_type}
              groups={type_groups}
              onChange={(value) => onChangeMapping({ new_type: value as BoardColumnType })}
              aria_label={`New column type for ${source.label}`}
              className="w-[180px]"
              min_menu_width={260}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default ImportMapColumnRow;
