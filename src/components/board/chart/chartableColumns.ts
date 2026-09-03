import type { BoardColumnKind } from "../columnTypes";
import type { ChartKind } from "./types";

/** Column kinds a chart can group/split by — a small, discrete value domain. Mirrors the backend's `ChartDataService::CHARTABLE_GROUP_TYPES`. */
export const CHARTABLE_GROUP_COLUMN_TYPES: BoardColumnKind[] = ["status", "tags", "dropdown", "people", "date", "checkbox"];

/** Column kinds a chart can sum/average. */
export const CHARTABLE_VALUE_COLUMN_TYPES: BoardColumnKind[] = ["number"];

export type ChartTypeOption = {
  kind: ChartKind;
  label: string;
  /** Whether this chart type supports a "Split by" second series (a line/pie/donut only ever shows one). */
  supports_split: boolean;
};

/** The chart kinds offered from the "Chart type" picker, in display order. */
export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  { kind: "bar", label: "Bar", supports_split: true },
  { kind: "stacked_bar", label: "Stacked bar", supports_split: true },
  { kind: "line", label: "Line", supports_split: true },
  { kind: "pie", label: "Pie", supports_split: false },
  { kind: "donut", label: "Donut", supports_split: false },
];
