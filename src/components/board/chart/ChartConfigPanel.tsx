"use client";
import React from "react";
import {
  ChartTypeBarIcon,
  ChartTypeDonutIcon,
  ChartTypeLineIcon,
  ChartTypePieIcon,
  ChartTypeStackedBarIcon,
} from "@/icons/board-icons";
import type { IconComponent } from "@/icons/workspace-icons";
import { COLUMN_KIND_SWATCH, type BoardColumnKind } from "../columnTypes";
import type { BoardColumnSwatch } from "../types";
import ColumnSwatchBadge from "../toolbar/ColumnSwatchBadge";
import InlineFieldMenu from "../toolbar/InlineFieldMenu";
import { CHART_TYPE_OPTIONS } from "./chartableColumns";
import { CHART_GROUP_SENTINEL, type BoardChartConfig, type ChartDataDto, type ChartKind, type ChartPickerOption } from "./types";

export type ChartConfigPanelProps = {
  data: ChartDataDto;
  onChangeConfig: (partial: Partial<BoardChartConfig>) => void;
};

const CHART_TYPE_ICON: Record<ChartKind, IconComponent> = {
  bar: ChartTypeBarIcon,
  stacked_bar: ChartTypeStackedBarIcon,
  line: ChartTypeLineIcon,
  pie: ChartTypePieIcon,
  donut: ChartTypeDonutIcon,
};

const GROUP_SENTINEL_SWATCH: BoardColumnSwatch = { accent_color: "#808080", glyph: "Tb" };

const swatchForColumn = (option: ChartPickerOption): BoardColumnSwatch =>
  option.id === CHART_GROUP_SENTINEL ? GROUP_SENTINEL_SWATCH : COLUMN_KIND_SWATCH[option.type as BoardColumnKind] ?? GROUP_SENTINEL_SWATCH;

type MeasureOption = { id: string; label: string; aggregate_fn: BoardChartConfig["aggregate_fn"]; value_column_id: string | null };

/**
 * The Chart tab's settings row — Chart type / Data from / Group by / Split by
 * / Measure, each an `InlineFieldMenu` (the same reusable column-picker
 * dropdown Sort/Group-by build on). Every pick calls `onChangeConfig`, which
 * `useBoardChart` persists immediately — no separate "Apply" button.
 */
const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({ data, onChangeConfig }) => {
  const { config } = data;

  const selected_chart_type = CHART_TYPE_OPTIONS.find((option) => option.kind === config.chart_type) ?? CHART_TYPE_OPTIONS[0];
  const SelectedChartIcon = CHART_TYPE_ICON[selected_chart_type.kind];

  const selected_source = data.source_views.find((view) => view.id === config.source_view_id);
  const selected_group_by = data.group_by_columns.find((option) => option.id === config.group_by_column_id);

  const split_by_options: ChartPickerOption[] = [
    { id: "", label: "None", type: "none" },
    ...data.group_by_columns.filter((option) => option.id !== config.group_by_column_id),
  ];
  const selected_split_by = split_by_options.find((option) => option.id === (config.split_by_column_id ?? "")) ?? split_by_options[0];

  const measure_options: MeasureOption[] = [
    { id: "count", label: "Count of items", aggregate_fn: "count", value_column_id: null },
    ...data.value_columns.flatMap((column) => [
      { id: `sum:${column.id}`, label: `Sum of ${column.label}`, aggregate_fn: "sum" as const, value_column_id: column.id },
      { id: `average:${column.id}`, label: `Average of ${column.label}`, aggregate_fn: "average" as const, value_column_id: column.id },
    ]),
  ];
  const selected_measure_id =
    config.aggregate_fn === "count" ? "count" : `${config.aggregate_fn}:${config.value_column_id ?? ""}`;
  const selected_measure = measure_options.find((option) => option.id === selected_measure_id) ?? measure_options[0];

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2.5">
      <InlineFieldMenu
        width={168}
        options={CHART_TYPE_OPTIONS}
        getOptionId={(option) => option.kind}
        isSelected={(option) => option.kind === config.chart_type}
        onSelect={(option) => onChangeConfig({ chart_type: option.kind })}
        renderValue={() => (
          <>
            <SelectedChartIcon size={15} className="flex-none text-shell-text-muted" />
            <span className="truncate text-[13.5px] text-shell-text">{selected_chart_type.label}</span>
          </>
        )}
        renderOption={(option) => {
          const OptionIcon = CHART_TYPE_ICON[option.kind];
          return (
            <>
              <OptionIcon size={15} className="flex-none text-shell-text-muted" />
              <span>{option.label}</span>
            </>
          );
        }}
      />

      {data.source_views.length > 1 && (
        <InlineFieldMenu
          width={190}
          menu_heading="Data from"
          options={data.source_views}
          getOptionId={(option) => String(option.id)}
          isSelected={(option) => option.id === config.source_view_id}
          onSelect={(option) => onChangeConfig({ source_view_id: option.id, group_by_column_id: null, split_by_column_id: null, value_column_id: null })}
          renderValue={() => (
            <span className="truncate text-[13.5px] text-shell-text">
              {selected_source ? `From: ${selected_source.label}` : "Select a tab"}
            </span>
          )}
          renderOption={(option) => (
            <span className="truncate">
              {option.label}
              {option.is_primary && <span className="ml-1.5 text-shell-text-faint">(Main)</span>}
            </span>
          )}
        />
      )}

      <InlineFieldMenu
        width={190}
        menu_heading="Group by"
        options={data.group_by_columns}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === config.group_by_column_id}
        onSelect={(option) => onChangeConfig({ group_by_column_id: option.id })}
        renderValue={() => (
          <>
            <ColumnSwatchBadge swatch={selected_group_by ? swatchForColumn(selected_group_by) : GROUP_SENTINEL_SWATCH} size={20} />
            <span className="truncate text-[13.5px] text-shell-text">{selected_group_by?.label ?? "Group by"}</span>
          </>
        )}
        renderOption={(option) => (
          <>
            <ColumnSwatchBadge swatch={swatchForColumn(option)} size={20} />
            <span>{option.label}</span>
          </>
        )}
      />

      <InlineFieldMenu
        width={190}
        menu_heading="Split by"
        options={split_by_options}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === (config.split_by_column_id ?? "")}
        onSelect={(option) => onChangeConfig({ split_by_column_id: option.id || null })}
        renderValue={() => (
          <span className="truncate text-[13.5px] text-shell-text">
            {selected_split_by.id ? `Split: ${selected_split_by.label}` : "Split by"}
          </span>
        )}
        renderOption={(option) => (
          <>
            {option.id ? <ColumnSwatchBadge swatch={swatchForColumn(option)} size={20} /> : null}
            <span>{option.label}</span>
          </>
        )}
      />

      <InlineFieldMenu
        width={190}
        menu_heading="Measure"
        options={measure_options}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === selected_measure.id}
        onSelect={(option) => onChangeConfig({ aggregate_fn: option.aggregate_fn, value_column_id: option.value_column_id })}
        renderValue={() => <span className="truncate text-[13.5px] text-shell-text">{selected_measure.label}</span>}
        renderOption={(option) => <span>{option.label}</span>}
      />
    </div>
  );
};

export default ChartConfigPanel;
