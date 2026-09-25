import type { BoardChartConfig, ChartDataDto } from "../chart/types";
import type { WorkloadPerson } from "../workload/types";

/**
 * Types for the Dashboard board view, mirroring
 * `App\Services\Board\DashboardDataService`'s response 1:1.
 */

export type DashboardWidgetType = "numbers" | "battery" | "chart" | "status_overview" | "table" | "workload";

export type NumbersFunction = "count" | "sum" | "average" | "min" | "max";

/** Each widget type's own settings, all optional: the API falls back to sensible defaults. */
export type DashboardWidgetSettings = {
  /** Numbers. */
  function?: NumbersFunction;
  column_id?: string | null;
  prefix?: string;
  suffix?: string;
  /** Battery and Status overview. */
  status_column_id?: string | null;
  /** Battery: the options that count as done. Unset uses labels like "Done". */
  done_option_ids?: string[] | null;
  /** Chart, the Chart tab's settings minus the source tab. */
  chart_type?: BoardChartConfig["chart_type"];
  group_by_column_id?: string | null;
  split_by_column_id?: string | null;
  aggregate_fn?: BoardChartConfig["aggregate_fn"];
  value_column_id?: string | null;
  date_bucket?: BoardChartConfig["date_bucket"];
  /** Table. */
  column_ids?: string[];
  limit?: number;
  /** Workload. */
  people_column_id?: string | null;
  effort_column_id?: string | null;
};

/** One saved widget, see `BoardDashboardConfig`. */
export type DashboardWidget = {
  id: string;
  type: DashboardWidgetType;
  title?: string | null;
  /** Columns it spans in the dashboard's 3 column grid. */
  width?: 1 | 2 | 3;
  /** Null reads the board the dashboard lives on. */
  source_board_id?: number | null;
  /** Null reads the source board's main tab. */
  source_view_id?: number | null;
  config?: DashboardWidgetSettings;
};

/** A `dashboard`-type view's saved settings, persisted as `BoardViewDto.dashboard_config`. */
export type BoardDashboardConfig = {
  widgets: DashboardWidget[];
};

export type DashboardColumnOption = { id: string; label: string; type: string };

export type StatusSegment = { id: string; label: string; color: string; count: number; percent: number; is_done: boolean };

export type NumbersData = { function: NumbersFunction; column_id: string | null; value: number; item_count: number };

export type StatusOverviewData = { status_column_id: string | null; total: number; segments: StatusSegment[] };

export type BatteryData = StatusOverviewData & { done_count: number; done_percent: number; done_option_ids: string[] };

export type TableWidgetData = {
  columns: DashboardColumnOption[];
  rows: { id: number; name: string; group_name: string | null; group_color: string | null; cells: { text: string; color: string | null }[] }[];
  total: number;
};

export type WorkloadWidgetData = {
  people_column_id: string | null;
  effort_column_id: string | null;
  people: { person: WorkloadPerson; load: number; item_count: number }[];
  unassigned: number;
};

/** One computed widget. `data` is null when `error` explains why it could not be computed. */
export type DashboardWidgetResult = {
  id: string;
  type: DashboardWidgetType;
  data: NumbersData | BatteryData | StatusOverviewData | ChartDataDto | TableWidgetData | WorkloadWidgetData | null;
  error: string | null;
  source_board: { id: number; label: string } | null;
  source_view_id: number | null;
  source_views: { id: number; label: string; is_primary: boolean }[];
  columns: DashboardColumnOption[];
};

/** `GET /api/boards/{board_id}/views/{view_id}/dashboard-data` response. */
export type DashboardDataDto = { config: BoardDashboardConfig; widgets: DashboardWidgetResult[] };

/** A board a widget can read, from `GET /api/boards/{board_id}/dashboard-sources`. */
export type DashboardSourceBoard = { id: number; label: string; workspace_name: string | null };
