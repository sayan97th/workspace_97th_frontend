/**
 * Types for the Chart board view — mirrors
 * `App\Services\Board\ChartDataService`'s response shape 1:1 so the frontend
 * never has to reshape the API payload before rendering it.
 */

export type ChartKind = "bar" | "stacked_bar" | "line" | "pie" | "donut";

export type ChartAggregateFn = "count" | "sum" | "average";

export type ChartDateBucket = "day" | "week" | "month";

/** Sentinel `group_by_column_id`/`split_by_column_id` value meaning "bucket by the board's own tables (groups)". */
export const CHART_GROUP_SENTINEL = "__group__";

/** A `chart`-type view's saved configuration — persisted as `BoardViewDto.chart_config`. */
export type BoardChartConfig = {
  chart_type: ChartKind;
  /** Which tab on this board the chart visualizes — a fresh chart tab has no items of its own. */
  source_view_id: number | null;
  /** A column id, or {@link CHART_GROUP_SENTINEL} to bucket by the source tab's own tables. */
  group_by_column_id: string | null;
  /** A column id, {@link CHART_GROUP_SENTINEL}, or null for a single series. */
  split_by_column_id: string | null;
  aggregate_fn: ChartAggregateFn;
  /** Required (and only meaningful) when `aggregate_fn` is `sum`/`average`. */
  value_column_id: string | null;
  /** Only meaningful when the group/split dimension is a `date` column. */
  date_bucket: ChartDateBucket | null;
};

/** One bar/pie-slice/x-axis category. */
export type ChartCategory = {
  key: string;
  label: string;
  color: string;
};

/** One data series (a single line/bar-set, or one segment of a stacked/split chart). */
export type ChartSeries = {
  key: string;
  name: string;
  color: string | null;
  /** One value per {@link ChartDataDto.categories} entry, same order. */
  data: number[];
};

/** A picker option for "Data from" / "Group by" / "Split by" / "Measure". */
export type ChartPickerOption = {
  id: string;
  label: string;
  type: string;
};

export type ChartSourceViewOption = {
  id: number;
  label: string;
  is_primary: boolean;
};

/** `GET /api/boards/{board_id}/views/{view_id}/chart-data` response. */
export type ChartDataDto = {
  config: BoardChartConfig;
  categories: ChartCategory[];
  series: ChartSeries[];
  total: number;
  has_data: boolean;
  source_views: ChartSourceViewOption[];
  group_by_columns: ChartPickerOption[];
  value_columns: ChartPickerOption[];
};
