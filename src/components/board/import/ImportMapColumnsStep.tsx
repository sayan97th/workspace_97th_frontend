"use client";
import React, { useState } from "react";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import type { BoardColumnDto, BoardColumnType, BoardGroupDto } from "@/types/board-content";
import type { BoardImportFileGroup, BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import ImportMapColumnRow, { mappingNeedsReview } from "./ImportMapColumnRow";
import ImportSelect, { type ImportSelectGroup } from "./ImportSelect";
import { ArrowRightIcon, ColumnsIcon, ImportItemNameIcon, InfoIcon, ResetIcon, WarningIcon } from "./importIcons";
import { READ_ONLY_COLUMN_TYPES } from "./importWizardUtils";

/** "Add items to" values that aren't a group id. */
export const NEW_GROUP_TARGET = "new";
export const FILE_GROUPS_TARGET = "file";

/** "Unmapped columns" choices. */
type UnmappedMode = "skip" | "create";

export type ImportMapColumnsStepProps = {
  file_name: string;
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
 */
const ImportMapColumnsStep: React.FC<ImportMapColumnsStepProps> = ({
  file_name,
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

  const updateMapping = (source_index: number, patch: Partial<BoardImportMapping>) => {
    onChangeMappings(mappings.map((mapping) => (mapping.source_index === source_index ? { ...mapping, ...patch } : mapping)));
  };

  /** A "+ Create new column" mapping for `source`, typed from its values. */
  const createMappingFor = (source: BoardImportSourceColumn): Partial<BoardImportMapping> => ({
    mode: "create",
    target_column_id: null,
    new_label: source.label,
    new_type: creatable_column_types.includes(source.suggested_type) ? source.suggested_type : "text",
  });

  const handleDestinationChange = (source: BoardImportSourceColumn, value: string) => {
    if (value === "skip") {
      updateMapping(source.index, { mode: "skip", target_column_id: null });
      return;
    }
    if (value === "create") {
      updateMapping(source.index, createMappingFor(source));
      return;
    }
    updateMapping(source.index, { mode: "map", target_column_id: Number(value.slice("map:".length)) });
  };

  /**
   * Only one column can feed the item's name. The column that held it before
   * goes back to the list as "Select column", so it's never imported twice.
   */
  const handleNameSourceChange = (value: string) => {
    const source_index = Number(value);
    onChangeMappings(
      mappings.map((mapping) => {
        if (mapping.source_index === source_index) return { ...mapping, mode: "name", target_column_id: null };
        if (mapping.mode === "name") return { ...mapping, mode: "skip", target_column_id: null };
        return mapping;
      })
    );
  };

  const name_mapping = mappings.find((mapping) => mapping.mode === "name");
  const rows = source_columns
    .map((source) => ({ source, mapping: mappings.find((candidate) => candidate.source_index === source.index) }))
    .filter((row): row is { source: BoardImportSourceColumn; mapping: BoardImportMapping } => row.mapping !== undefined && row.mapping.mode !== "name");

  const review_rows = rows.filter((row) => mappingNeedsReview(row.mapping, row.source, board_columns));
  const visible_rows = is_review_only ? review_rows : rows;
  const used_column_ids = new Set(
    mappings.filter((mapping) => mapping.mode === "map" && mapping.target_column_id != null).map((mapping) => mapping.target_column_id as number)
  );

  const empty_indexes = new Set(source_columns.filter((source) => source.filled_count === 0).map((source) => source.index));
  const importable_empty_count = rows.filter((row) => empty_indexes.has(row.source.index) && row.mapping.mode !== "skip").length;

  const skipEmptyColumns = () => {
    onChangeMappings(
      mappings.map((mapping) =>
        empty_indexes.has(mapping.source_index) && mapping.mode !== "name" ? { ...mapping, mode: "skip", target_column_id: null } : mapping
      )
    );
  };

  // "Unmapped columns" covers every row that doesn't land in an existing board column.
  const unmapped_rows = rows.filter((row) => row.mapping.mode === "create" || row.mapping.mode === "skip");
  const can_create = (source: BoardImportSourceColumn) => !READ_ONLY_COLUMN_TYPES.includes(source.suggested_type);
  const unmapped_mode: UnmappedMode | null =
    unmapped_rows.length === 0
      ? null
      : unmapped_rows.every((row) => row.mapping.mode === "skip")
        ? "skip"
        : unmapped_rows.every((row) => row.mapping.mode === "create" || !can_create(row.source))
          ? "create"
          : null;

  const applyUnmappedMode = (mode: string) => {
    const unmapped_indexes = new Set(unmapped_rows.map((row) => row.source.index));
    onChangeMappings(
      mappings.map((mapping) => {
        if (!unmapped_indexes.has(mapping.source_index)) return mapping;
        const source = source_columns.find((candidate) => candidate.index === mapping.source_index);
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

  const name_groups: ImportSelectGroup[] = [
    { options: source_columns.map((source) => ({ value: String(source.index), label: source.label, hint: source.filled_count === 0 ? "Empty" : undefined })) },
  ];

  const file_group_names = file_groups.map((group) => `${group.name} (${group.row_count})`).join(", ");

  return (
    <div className="iw-map">
      <div className="iw-map-inner">
        <h2 className="iw-step-title">Map your imported file columns to your board</h2>

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
            <div className="iw-name-source">
              <ImportSelect
                value={name_mapping ? String(name_mapping.source_index) : null}
                groups={name_groups}
                onChange={handleNameSourceChange}
                onClear={() => name_mapping && updateMapping(name_mapping.source_index, { mode: "skip", target_column_id: null })}
                placeholder="Select column"
                aria_label="File column for the item name"
                is_invalid={!name_mapping}
                className="flex-1"
              />
              <InfoTip content="The file column whose values become each item's name" />
            </div>
            <span className="iw-row-arrow" aria-hidden="true">
              <ArrowRightIcon size={18} />
            </span>
            <span className="iw-item-target">
              <ImportItemNameIcon />
              Item
            </span>
          </div>

          <div className="iw-rows">
            {visible_rows.length === 0 ? (
              <p className="iw-empty">{is_review_only ? "Nothing left to review." : "This file has no other columns."}</p>
            ) : (
              visible_rows.map(({ source, mapping }) => (
                <ImportMapColumnRow
                  key={source.index}
                  source={source}
                  mapping={mapping}
                  suggested_mapping={suggested_mappings.find((candidate) => candidate.source_index === source.index)}
                  row_count={row_count}
                  board_columns={board_columns}
                  creatable_column_types={creatable_column_types}
                  used_column_ids={used_column_ids}
                  onChangeDestination={(value) => handleDestinationChange(source, value)}
                  onChangeMapping={(patch) => updateMapping(source.index, patch)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportMapColumnsStep;
