"use client";
import React, { useState } from "react";
import type { BoardColumnDto, BoardColumnType, BoardGroupDto } from "@/types/board-content";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import ImportMapColumnRow, { mappingNeedsReview } from "./ImportMapColumnRow";

const NEW_GROUP_VALUE = "__new__";

export type ImportMapColumnsStepProps = {
  file_name: string;
  row_count: number;
  source_columns: BoardImportSourceColumn[];
  board_columns: BoardColumnDto[];
  groups: BoardGroupDto[];
  creatable_column_types: BoardColumnType[];
  mappings: BoardImportMapping[];
  /** What the backend pre-filled, for "Reset to suggestions" and for telling automatic matches apart from hand-picked ones. */
  suggested_mappings: BoardImportMapping[];
  onChangeMappings: (mappings: BoardImportMapping[]) => void;
  target_group_id: number | null;
  onChangeTargetGroupId: (group_id: number | null) => void;
  new_group_name: string;
  onChangeNewGroupName: (name: string) => void;
  error: string | null;
};

const toolbar_button_class =
  "rounded-lg border border-shell-border-strong px-2.5 py-1 text-[12px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50";

/**
 * Step 2 ("Map columns"): one row per column the uploaded file actually
 * has (see `ImportMapColumnRow`), each with a single destination picker: the
 * item's own name, an existing board column, a freshly-created one, or
 * "Don't import". Also owns the "Add items to" table picker above the list.
 *
 * Every row arrives already auto-mapped by the backend's `suggestMappings()`:
 * an exact label match onto an existing (writable) board column, or
 * (failing that) a brand-new column typed from the uploaded values
 * themselves, so the user never has to hand-pick a destination for every
 * column. Columns a value was split across in the file (a Timeline's
 * "- Start"/"- End" pair, a checklist's repeated "Task | Status" pairs)
 * arrive already merged into one row. A row whose destination can't hold
 * every value is flagged, and the "Needs review" filter narrows the list to
 * just those; "Don't import empty columns" clears out the columns a
 * monday.com export often carries with nothing in them.
 */
const ImportMapColumnsStep: React.FC<ImportMapColumnsStepProps> = ({
  file_name,
  row_count,
  source_columns,
  board_columns,
  groups,
  creatable_column_types,
  mappings,
  suggested_mappings,
  onChangeMappings,
  target_group_id,
  onChangeTargetGroupId,
  new_group_name,
  onChangeNewGroupName,
  error,
}) => {
  const [is_review_only, setIsReviewOnly] = useState(false);

  const updateMapping = (source_index: number, patch: Partial<BoardImportMapping>) => {
    onChangeMappings(mappings.map((mapping) => (mapping.source_index === source_index ? { ...mapping, ...patch } : mapping)));
  };

  const handleDestinationChange = (source: BoardImportSourceColumn, value: string) => {
    if (value === "name") {
      // Only one column can feed the item's own name, reassigning it here
      // demotes whichever column held it before back to unmapped.
      onChangeMappings(
        mappings.map((mapping) => {
          if (mapping.source_index === source.index) return { ...mapping, mode: "name", target_column_id: null };
          if (mapping.mode === "name") return { ...mapping, mode: "skip" };
          return mapping;
        })
      );
      return;
    }

    if (value === "skip") {
      updateMapping(source.index, { mode: "skip", target_column_id: null });
      return;
    }

    if (value === "create") {
      const suggested_type = creatable_column_types.includes(source.suggested_type) ? source.suggested_type : "text";
      updateMapping(source.index, { mode: "create", target_column_id: null, new_label: source.label, new_type: suggested_type });
      return;
    }

    updateMapping(source.index, { mode: "map", target_column_id: Number(value.slice("map:".length)) });
  };

  const empty_indexes = new Set(source_columns.filter((source) => source.filled_count === 0).map((source) => source.index));
  const importable_empty_count = mappings.filter((mapping) => empty_indexes.has(mapping.source_index) && mapping.mode !== "skip" && mapping.mode !== "name").length;

  const skipEmptyColumns = () => {
    onChangeMappings(
      mappings.map((mapping) =>
        empty_indexes.has(mapping.source_index) && mapping.mode !== "name" ? { ...mapping, mode: "skip", target_column_id: null } : mapping
      )
    );
  };

  const rows = source_columns
    .map((source) => ({ source, mapping: mappings.find((candidate) => candidate.source_index === source.index) }))
    .filter((row): row is { source: BoardImportSourceColumn; mapping: BoardImportMapping } => row.mapping !== undefined);
  const review_count = rows.filter((row) => mappingNeedsReview(row.mapping, row.source, board_columns)).length;
  const visible_rows = is_review_only ? rows.filter((row) => mappingNeedsReview(row.mapping, row.source, board_columns)) : rows;

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

      <div className="flex flex-wrap items-center gap-2 border-b border-shell-border px-7 py-2.5">
        <button
          type="button"
          onClick={() => setIsReviewOnly((current) => !current)}
          disabled={review_count === 0 && !is_review_only}
          aria-pressed={is_review_only}
          className={`${toolbar_button_class} ${is_review_only ? "border-warning-500 bg-warning-500/10 text-warning-600" : ""}`}
        >
          {review_count === 0 ? "Every column fits its destination" : `Needs review (${review_count})`}
        </button>
        <button type="button" onClick={skipEmptyColumns} disabled={importable_empty_count === 0} className={toolbar_button_class}>
          Don&apos;t import empty columns{importable_empty_count > 0 ? ` (${importable_empty_count})` : ""}
        </button>
        <button type="button" onClick={() => onChangeMappings(suggested_mappings)} className={toolbar_button_class}>
          Reset to suggestions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-1 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-muted">
          <span className="truncate">{file_name}</span>
          <span className="w-4" />
          <span>Board columns</span>
        </div>

        {visible_rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-shell-text-muted">Nothing left to review.</p>
        ) : (
          <div className="flex flex-col divide-y divide-shell-border">
            {visible_rows.map(({ source, mapping }) => (
              <ImportMapColumnRow
                key={source.index}
                source={source}
                mapping={mapping}
                suggested_mapping={suggested_mappings.find((candidate) => candidate.source_index === source.index)}
                row_count={row_count}
                board_columns={board_columns}
                creatable_column_types={creatable_column_types}
                onChangeDestination={(value) => handleDestinationChange(source, value)}
                onChangeMapping={(patch) => updateMapping(source.index, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportMapColumnsStep;
