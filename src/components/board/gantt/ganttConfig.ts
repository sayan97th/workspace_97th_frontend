/**
 * Settings shared by the Gantt view (`GanttChart`) and the board that feeds
 * it (`TableBoardView`), persisted as `BoardViewDto.gantt_config`.
 */

/** Which colors the bars: a Status column id, the item's group (monday.com's default), or nothing (one neutral color). */
export type BoardGanttColorBy = string | "group" | "none";

/** What is written next to each bar. */
export type BoardGanttBarLabel = "none" | "name";

/** A snapshot of every item's dates, drawn as a gray bar under the live one. */
export type BoardGanttBaseline = {
  /** ISO timestamp of when the baseline was saved. */
  saved_at: string;
  /** Name of who saved it. */
  saved_by?: string | null;
  /** Item id to the `YYYY-MM-DD` range it had when the baseline was saved. */
  items: Record<string, { start: string; end?: string | null }>;
};

/** A `gantt`-type view's saved settings. */
export type BoardGanttConfig = {
  /** Timeline or Date column that places the bars. `null` uses the board's first Timeline column, then its first Date column. */
  date_column_id?: string | null;
  /** `null` colors by group. */
  color_by?: BoardGanttColorBy | null;
  /** Groups whose items are left off the chart (the header's filter). */
  hidden_group_ids?: number[] | null;
  /** Defaults to "none", bars carry no text, like monday.com's default. */
  bar_label?: BoardGanttBarLabel | null;
  /** The thin colored line and "Name · dates · days" label on each group row. Defaults to true. */
  show_group_summary?: boolean;
  /** Dependency arrows between bars. Defaults to true. */
  show_dependencies?: boolean;
  /** Highlights the chain of dependent items that sets the project's end date. Defaults to false. */
  show_critical_path?: boolean;
  /** The color legend under the chart. Defaults to true. */
  show_legend?: boolean;
  /** Shades Saturdays and Sundays at the Days scale. Defaults to true. */
  show_weekends?: boolean;
  /** Draws the saved baseline under each bar. Defaults to true once a baseline exists. */
  show_baseline?: boolean;
  baseline?: BoardGanttBaseline | null;
};

/** A Timeline or Date column the chart can place bars by. */
export type GanttDateSource = { id: string; label: string; kind: "date" | "timeline" };

/** A Status column the chart can color bars by. */
export type GanttColorSource = { id: string; label: string };

/** A group of the board, for the header's filter. */
export type GanttGroupOption = { id: number; label: string; color: string };

/** One swatch of the legend under the chart. */
export type GanttLegendItem = { key: string; label: string; color: string };

/** Bar color when nothing colors it, monday.com's primary blue. */
export const DEFAULT_GANTT_BAR_COLOR = "#579bfc";

/** The critical path's red, monday.com's "Stuck" color. */
export const GANTT_CRITICAL_COLOR = "#e2445c";

/** The baseline bar's gray. */
export const GANTT_BASELINE_COLOR = "#c3c6d4";

/** A JSON object with no keys can come back from the API as `[]`, so the baseline items are normalized to a plain record. */
export const getBaselineItems = (baseline: BoardGanttBaseline | null | undefined): BoardGanttBaseline["items"] => {
  const items = baseline?.items;
  return items && !Array.isArray(items) && typeof items === "object" ? items : {};
};
