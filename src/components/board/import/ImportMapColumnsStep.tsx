"use client";
import React, { useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardColumnDto, BoardColumnType, BoardGroupDto } from "@/types/board-content";
import type { BoardImportFileGroup, BoardImportMapping, BoardImportSheet, BoardImportSourceColumn } from "@/types/board-import";
import ImportAddColumnButton from "./ImportAddColumnButton";
import ImportFileSummary from "./ImportFileSummary";
import ImportMapColumnRow, { mappingNeedsReview } from "./ImportMapColumnRow";
import ImportRemovedColumns from "./ImportRemovedColumns";
import ImportSelect, { type ImportSelectGroup } from "./ImportSelect";
import ImportSheetTabs from "./ImportSheetTabs";
import { ArrowRightIcon, ColumnsIcon, CopyIcon, ImportColumnIcon, ImportItemNameIcon, InfoIcon, ResetIcon, SparkleIcon, WarningIcon } from "./importIcons";
import { IMPORT_TYPE_LABELS, READ_ONLY_COLUMN_TYPES, insertCopyMapping, mappingRowKey } from "./importWizardUtils";

/** "Add items to" values that aren't a group id. */
export const NEW_GROUP_TARGET = "new";
export const FILE_GROUPS_TARGET = "file";

/** "Unmapped columns" choices. */
type UnmappedMode = "skip" | "create";

export type ImportMapColumnsStepProps = {
  file_name: string;
  /** Every sheet of the workbook, tabs are shown when there are several. */
  sheets: BoardImportSheet[];
  sheet_index: number;
  /** The sheet being read after a tab was picked, null otherwise. */
  loading_sheet_index: number | null;
  onChangeSheet: (sheet_index: number) => void;
  row_count: number;
  source_columns: BoardImportSourceColumn[];
  board_columns: BoardColumnDto[];
  groups: BoardGroupDto[];
  file_groups: BoardImportFileGroup[];
  subitem_count: number;
  creatable_column_types: BoardColumnType[];
  mappings: BoardImportMapping[];
  /** What the backend pre-filled, for "Reset" and for telling automatic matches apart from hand-picked ones. */
  suggested_mappings: BoardImportMapping[];
  onChangeMappings: (mappings: BoardImportMapping[]) => void;
  /** A group id, {@link NEW_GROUP_TARGET} or {@link FILE_GROUPS_TARGET}. */
  target: string;
  onChangeTarget: (target: string) => void;
  new_group_name: string;
  onChangeNewGroupName: (name: string) => void;
  import_subitems: boolean;
  onChangeImportSubitems: (value: boolean) => void;
};

/** A muted "i" with a tooltip, like the ones next to monday.com's import controls. */
const InfoTip: React.FC<{ content: string }> = ({ content }) => (
  <PortalTooltip content={content}>
    <span className="iw-info-icon" tabIndex={0} aria-label={content}>
      <InfoIcon size={16} />
    </span>
  </PortalTooltip>
);

/**
 * Step 2 ("Map columns"), styled after monday.com's "Map your imported file
 * columns to your board": where the items go ("Add items to"), what happens
 * to columns that match nothing on the board ("Unmapped columns"), and a
 * card listing every file column next to the board column it lands in. The
 * column feeding the item's name is picked in the card's pinned first row.
 *
 * Every row arrives already mapped by the backend's `suggestMappings()`: an
 * exact label match onto an existing writable column, or a new column typed
 * from the values themselves. Columns a value was split across in the file
 * (a Timeline's "- Start"/"- End" pair, a checklist's repeated "Task |
 * Status" pairs) arrive merged into one row. Rows whose destination can't
 * hold every value are flagged, and "Needs review" narrows the list to them.
 *
 * The list only shows what will be imported. A removed column moves to the
 * "Not imported" tray under the rows, where it can be restored, and any file
 * column can be imported again into another board column ("Duplicate" on a
 * row, or "Add column from file" at the end of the list). Rows are keyed by
 * {@link mappingRowKey} since several rows may share one source column.
 */
const ImportMapColumnsStep: React.FC<ImportMapColumnsStepProps> = ({
  file_name,
  sheets,
  sheet_index,
  loading_sheet_index,
  onChangeSheet,
  row_count,
  source_columns,
  board_columns,
  groups,
  file_groups,
  subitem_count,
  creatable_column_types,
  mappings,
  suggested_mappings,
  onChangeMappings,
  target,
  onChangeTarget,
  new_group_name,
  onChangeNewGroupName,
  import_subitems,
  onChangeImportSubitems,
}) => {
  const [is_review_only, setIsReviewOnly] = useState(false);
  /** The row just added by "Duplicate" or "Add column from file", it scrolls into view and opens its settings. */
  const [fresh_row_key, setFreshRowKey] = useState<string | null>(null);

  const findSource = (source_index: number) => source_columns.find((candidate) => candidate.index === source_index);

  const updateMapping = (row_key: string, patch: Partial<BoardImportMapping>) => {
    onChangeMappings(mappings.map((mapping) => (mappingRowKey(mapping) === row_key ? { ...mapping, ...patch } : mapping)));
  };

  /** A "+ Create new column" mapping for `source`, typed from its values. */
  const createMappingFor = (source: BoardImportSourceColumn): Partial<BoardImportMapping> => ({
    mode: "create",
    target_column_id: null,
    new_label: source.label,
    new_type: creatable_column_types.includes(source.suggested_type) ? source.suggested_type : "text",
  });

  const can_create = (source: BoardImportSourceColumn) => !READ_ONLY_COLUMN_TYPES.includes(source.suggested_type);

  /**
   * What a removed column comes back as: its suggested destination, or a new
   * column typed from its values. A column whose values the board computes
   * (an exported Item ID or formula) waits for a board column to be picked.
   * A suggested board column another row took in the meantime isn't reused.
   */
  const restoredMappingFor = (mapping: BoardImportMapping, source: BoardImportSourceColumn): BoardImportMapping => {
    const suggested = suggested_mappings.find((candidate) => candidate.source_index === mapping.source_index);
    const is_taken = suggested?.mode === "map" && suggested.target_column_id != null && used_column_ids.has(suggested.target_column_id);
    if (suggested && !is_taken && (suggested.mode === "map" || suggested.mode === "create")) return { ...mapping, ...suggested };
    if (can_create(source)) return { ...mapping, ...createMappingFor(source) };
    return { ...mapping, mode: "map", target_column_id: null };
  };

  const handleDestinationChange = (mapping: BoardImportMapping, source: BoardImportSourceColumn, value: string) => {
    const row_key = mappingRowKey(mapping);
    if (value === "skip") {
      removeRow(mapping);
      return;
    }
    if (value === "create") {
      updateMapping(row_key, { ...createMappingFor(source), new_label: mapping.is_copy ? (mapping.new_label ?? source.label) : source.label });
      return;
    }
    updateMapping(row_key, { mode: "map", target_column_id: Number(value.slice("map:".length)) });
  };

  /** A copy is deleted outright, the file's own row is left out and moves to the "Not imported" tray. */
  const removeRow = (mapping: BoardImportMapping) => {
    const row_key = mappingRowKey(mapping);
    if (mapping.is_copy) {
      onChangeMappings(mappings.filter((candidate) => mappingRowKey(candidate) !== row_key));
      return;
    }
    updateMapping(row_key, { mode: "skip", target_column_id: null });
  };

  const addCopyOf = (source: BoardImportSourceColumn) => {
    const result = insertCopyMapping(
      mappings,
      source,
      creatable_column_types,
      source_columns,
      board_columns.map((column) => column.label)
    );
    setIsReviewOnly(false);
    setFreshRowKey(result.row_key);
    onChangeMappings(result.mappings);
  };

  const restoreSource = (source: BoardImportSourceColumn) => {
    const row_key = `source-${source.index}`;
    onChangeMappings(
      mappings.map((mapping) => (mappingRowKey(mapping) === row_key && mapping.mode === "skip" ? restoredMappingFor(mapping, source) : mapping))
    );
    setFreshRowKey(row_key);
  };

  const restoreAll = () => {
    onChangeMappings(
      mappings.map((mapping) => {
        const source = findSource(mapping.source_index);
        return mapping.mode === "skip" && source ? restoredMappingFor(mapping, source) : mapping;
      })
    );
    setFreshRowKey(null);
  };

  /** "Add column from file": brings back a column left out of the import, or imports one again as a copy. */
  const handleAddColumn = (source: BoardImportSourceColumn) => {
    const is_left_out = mappings.some((mapping) => mappingRowKey(mapping) === `source-${source.index}` && mapping.mode === "skip");
    if (is_left_out) restoreSource(source);
    else addCopyOf(source);
  };

  /**
   * Only one column can feed the item's name. The column that held it before
   * goes back to the list with its suggested destination (or a new column
   * typed from its values), so switching the name never drops its data.
   * Copies of the picked column stay as they are.
   */
  const handleNameSourceChange = (value: string) => {
    const name_row_key = `source-${Number(value)}`;
    onChangeMappings(
      mappings.map((mapping) => {
        if (mappingRowKey(mapping) === name_row_key) return { ...mapping, mode: "name", target_column_id: null };
        if (mapping.mode !== "name") return mapping;
        const suggested = suggested_mappings.find((candidate) => candidate.source_index === mapping.source_index);
        if (suggested && suggested.mode !== "name") return { ...suggested };
        const source = findSource(mapping.source_index);
        if (source && can_create(source)) return { ...mapping, ...createMappingFor(source) };
        return { ...mapping, mode: "skip", target_column_id: null };
      })
    );
  };

  const name_mapping = mappings.find((mapping) => mapping.mode === "name");
  // Rows follow the mappings' own order, so a copy sits right under the row it was made from.
  const rows = mappings
    .filter((mapping) => mapping.mode !== "name")
    .map((mapping) => ({ mapping, source: findSource(mapping.source_index) }))
    .filter((row): row is { mapping: BoardImportMapping; source: BoardImportSourceColumn } => row.source !== undefined);
  const imported_rows = rows.filter((row) => row.mapping.mode !== "skip");
  const removed_sources = rows.filter((row) => row.mapping.mode === "skip").map((row) => row.source);

  const review_rows = imported_rows.filter((row) => mappingNeedsReview(row.mapping, row.source, board_columns));
  const visible_rows = is_review_only ? review_rows : imported_rows;
  const used_column_ids = new Set(
    mappings.filter((mapping) => mapping.mode === "map" && mapping.target_column_id != null).map((mapping) => mapping.target_column_id as number)
  );

  const empty_indexes = new Set(source_columns.filter((source) => source.filled_count === 0).map((source) => source.index));
  const importable_empty_count = imported_rows.filter((row) => empty_indexes.has(row.source.index)).length;

  const skipEmptyColumns = () => {
    onChangeMappings(
      mappings
        .filter((mapping) => !(mapping.is_copy && empty_indexes.has(mapping.source_index)))
        .map((mapping) =>
          empty_indexes.has(mapping.source_index) && mapping.mode !== "name" ? { ...mapping, mode: "skip", target_column_id: null } : mapping
        )
    );
  };

  // "Unmapped columns" covers every row that doesn't land in an existing board column.
  const unmapped_rows = rows.filter((row) => row.mapping.mode === "create" || row.mapping.mode === "skip");
  const unmapped_mode: UnmappedMode | null =
    unmapped_rows.length === 0
      ? null
      : unmapped_rows.every((row) => row.mapping.mode === "skip")
        ? "skip"
        : unmapped_rows.every((row) => row.mapping.mode === "create" || !can_create(row.source))
          ? "create"
          : null;

  const applyUnmappedMode = (mode: string) => {
    const unmapped_keys = new Set(unmapped_rows.map((row) => mappingRowKey(row.mapping)));
    onChangeMappings(
      mappings
        // Leaving unmapped columns out drops the copies too, they only exist to create a column.
        .filter((mapping) => !(mode === "skip" && mapping.is_copy && unmapped_keys.has(mappingRowKey(mapping))))
        .map((mapping) => {
          if (!unmapped_keys.has(mappingRowKey(mapping))) return mapping;
          if (mapping.mode === "create") return mode === "create" ? mapping : { ...mapping, mode: "skip", target_column_id: null };
          const source = findSource(mapping.source_index);
          if (mode === "create" && source && can_create(source)) return { ...mapping, ...createMappingFor(source) };
          return { ...mapping, mode: "skip", target_column_id: null };
        })
    );
  };

  const target_groups: ImportSelectGroup[] = [
    {
      options: [
        { value: NEW_GROUP_TARGET, label: "New group" },
        ...(file_groups.length > 0
          ? [{ value: FILE_GROUPS_TARGET, label: `File groups (${file_groups.length})`, hint: "Keeps the file's groups" }]
          : []),
      ],
    },
    ...(groups.length > 0
      ? [
          {
            label: "Existing groups",
            options: groups.map((group) => ({
              value: String(group.id),
              label: group.name,
              icon: <span className="h-3 w-3 flex-none rounded-full" style={{ background: group.accent_color || "#579bfc" }} />,
            })),
          },
        ]
      : []),
  ];

  // The column the backend picked to name the items, marked "Suggested" in the picker.
  const suggested_name_index = suggested_mappings.find((mapping) => mapping.mode === "name")?.source_index ?? null;
  const is_text_type = (source: BoardImportSourceColumn) => source.suggested_type === "text" || source.suggested_type === "long_text";
  const nameOption = (source: BoardImportSourceColumn) => ({
    value: String(source.index),
    label: source.label,
    icon: <ImportColumnIcon type={source.suggested_type} />,
    hint: source.filled_count === 0 ? "Empty" : source.index === suggested_name_index ? "Suggested" : IMPORT_TYPE_LABELS[source.suggested_type],
  });
  const text_sources = source_columns.filter(is_text_type);
  const other_sources = source_columns.filter((source) => !is_text_type(source));
  const name_groups: ImportSelectGroup[] = (
    [
      { label: other_sources.length > 0 ? "Text columns" : undefined, options: text_sources.map(nameOption) },
      { label: text_sources.length > 0 ? "Other columns" : undefined, options: other_sources.map(nameOption) },
    ] as ImportSelectGroup[]
  ).filter((group) => group.options.length > 0);
  const name_source = name_mapping ? (source_columns.find((source) => source.index === name_mapping.source_index) ?? null) : null;
  const name_preview = name_source?.sample_values.slice(0, 2) ?? [];

  const file_group_names = file_groups.map((group) => `${group.name} (${group.row_count})`).join(", ");

  return (
    <div className="iw-map">
      <div className="iw-map-inner">
        <h2 className="iw-step-title">Map your imported file columns to your board</h2>

        <ImportSheetTabs sheets={sheets} sheet_index={sheet_index} loading_index={loading_sheet_index} onChange={onChangeSheet} />
        <ImportFileSummary source_columns={source_columns} name_source={name_source} />

        <div className="iw-map-controls">
          <div className="iw-control">
            <span className="iw-control-label">
              <InfoTip content="Choose the group your imported items are added to. File groups keeps the groups of a monday.com export." />
              Add items to
            </span>
            <ImportSelect
              value={target}
              groups={target_groups}
              onChange={onChangeTarget}
              aria_label="Add items to"
              className="w-[170px]"
              min_menu_width={240}
            />
          </div>

          <div className="iw-control">
            <span className="iw-control-label">
              <InfoTip content="Choose what happens to file columns that aren't mapped to a board column: leave them out, or add each one as a new column." />
              Unmapped columns:
            </span>
            <ImportSelect
              value={unmapped_mode}
              groups={[
                {
                  options: [
                    { value: "skip", label: "Don't import" },
                    { value: "create", label: "Create new columns" },
                  ],
                },
              ]}
              onChange={applyUnmappedMode}
              placeholder={unmapped_rows.length === 0 ? "None" : "Mixed"}
              is_disabled={unmapped_rows.length === 0}
              aria_label="Unmapped columns"
              className="w-[190px]"
            />
          </div>
        </div>

        {target === NEW_GROUP_TARGET && (
          <div className="iw-group-name">
            <label className="iw-control-label" htmlFor="iw-new-group-name">
              Group name
            </label>
            <input
              id="iw-new-group-name"
              type="text"
              className="iw-input flex-1"
              value={new_group_name}
              onChange={(event) => onChangeNewGroupName(event.target.value)}
              placeholder="Imported items"
              maxLength={255}
            />
          </div>
        )}
        {target === FILE_GROUPS_TARGET && file_groups.length > 0 && (
          <div className="iw-group-summary">
            <span className="iw-row-note">
              Items go to {file_groups.length === 1 ? "the group" : `${file_groups.length} groups`} from the file, a group with the same name on
              this board is reused.
            </span>
            <PortalTooltip content={file_group_names}>
              <span className="iw-group-list" tabIndex={0}>
                {file_group_names}
              </span>
            </PortalTooltip>
          </div>
        )}

        <div className="iw-tools">
          <div className="iw-tools-group">
            {subitem_count > 0 ? (
              <span className="iw-control-label">
                <label className="iw-checkbox">
                  <input type="checkbox" checked={import_subitems} onChange={(event) => onChangeImportSubitems(event.target.checked)} />
                  Import {subitem_count} subitem{subitem_count === 1 ? "" : "s"}
                </label>
                <InfoTip content="Adds the subitems listed under each item in the file. Their columns are matched to this board's subitem columns by name, or created." />
              </span>
            ) : (
              <span className="iw-row-note">
                {row_count} row{row_count === 1 ? "" : "s"} · {source_columns.length} column{source_columns.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="iw-tools-group">
            <PortalTooltip content={review_rows.length === 0 ? "Every column fits its destination" : "Show only the columns whose values don't all fit"}>
              <button
                type="button"
                className="iw-chip"
                data-tone={review_rows.length === 0 ? "success" : "warning"}
                aria-pressed={is_review_only}
                disabled={review_rows.length === 0 && !is_review_only}
                onClick={() => setIsReviewOnly((current) => !current)}
              >
                <WarningIcon size={13} />
                Needs review ({review_rows.length})
              </button>
            </PortalTooltip>
            <PortalTooltip content="Don't import the columns that have no values in this file">
              <button type="button" className="iw-chip" disabled={importable_empty_count === 0} onClick={skipEmptyColumns}>
                <ColumnsIcon size={13} />
                Skip empty ({importable_empty_count})
              </button>
            </PortalTooltip>
            <PortalTooltip content="Go back to the suggested mapping">
              <button type="button" className="iw-chip" onClick={() => onChangeMappings(suggested_mappings)}>
                <ResetIcon size={13} />
                Reset
              </button>
            </PortalTooltip>
          </div>
        </div>

        <div className="iw-card">
          <div className="iw-card-head iw-row-grid">
            <span title={file_name}>{file_name}</span>
            <span>Board columns</span>
          </div>

          <div className="iw-name-row iw-row-grid">
            <div className="iw-name-cell">
              <div className="iw-name-source">
                <ImportSelect
                  value={name_mapping ? String(name_mapping.source_index) : null}
                  groups={name_groups}
                  onChange={handleNameSourceChange}
                  onClear={() => name_mapping && updateMapping(mappingRowKey(name_mapping), { mode: "skip", target_column_id: null })}
                  placeholder="Select column"
                  aria_label="File column for the item name"
                  display_icon={name_source ? <ImportColumnIcon type={name_source.suggested_type} /> : undefined}
                  is_invalid={!name_mapping}
                  className="flex-1"
                  min_menu_width={280}
                />
                <InfoTip content="Any file column can name the items, not only the first one. Its values become each item's name, a text column reads best." />
                {name_source && (
                  <PortalTooltip content="Also import this column into a board column">
                    <button
                      type="button"
                      className="iw-row-action"
                      aria-label={`Duplicate ${name_source.label}`}
                      onClick={() => addCopyOf(name_source)}
                    >
                      <CopyIcon size={14} />
                    </button>
                  </PortalTooltip>
                )}
              </div>
              {name_source && (
                <span className="iw-name-preview">
                  {name_source.index === suggested_name_index && (
                    <span className="iw-name-badge">
                      <SparkleIcon size={11} />
                      Suggested
                    </span>
                  )}
                  {name_preview.length > 0 ? (
                    <span className="iw-name-samples" title={name_preview.join(" · ")}>
                      {name_preview.map((value) => `"${value}"`).join(", ")}
                    </span>
                  ) : (
                    <span className="iw-name-samples">Empty column, items will be named &quot;Untitled item&quot;</span>
                  )}
                </span>
              )}
            </div>
            <span className="iw-row-arrow" aria-hidden="true">
              <ArrowRightIcon size={18} />
            </span>
            <span className="iw-item-target">
              <ImportItemNameIcon />
              <span className="iw-item-target-text">
                Item
                <span className="iw-item-target-type">Text, first column</span>
              </span>
            </span>
          </div>

          <div className="iw-rows">
            {visible_rows.length === 0 ? (
              <p className="iw-empty">
                {is_review_only
                  ? "Nothing left to review."
                  : removed_sources.length > 0
                    ? "Every other column is left out, restore one below or add a column from the file."
                    : "This file has no other columns."}
              </p>
            ) : (
              visible_rows.map(({ source, mapping }) => {
                const row_key = mappingRowKey(mapping);
                return (
                  <ImportMapColumnRow
                    key={row_key}
                    source={source}
                    mapping={mapping}
                    suggested_mapping={mapping.is_copy ? undefined : suggested_mappings.find((candidate) => candidate.source_index === source.index)}
                    row_count={row_count}
                    board_columns={board_columns}
                    creatable_column_types={creatable_column_types}
                    used_column_ids={used_column_ids}
                    onChangeDestination={(value) => handleDestinationChange(mapping, source, value)}
                    onChangeMapping={(patch) => updateMapping(row_key, patch)}
                    onDuplicate={() => addCopyOf(source)}
                    onRemove={() => removeRow(mapping)}
                    is_fresh={row_key === fresh_row_key}
                  />
                );
              })
            )}

            {!is_review_only && <ImportAddColumnButton source_columns={source_columns} mappings={mappings} onAdd={handleAddColumn} />}
            <ImportRemovedColumns sources={removed_sources} onRestore={restoreSource} onRestoreAll={restoreAll} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportMapColumnsStep;
