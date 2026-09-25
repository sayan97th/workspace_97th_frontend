import type { DashboardWidget, DashboardWidgetType } from "./types";

export type WidgetTypeOption = {
  type: DashboardWidgetType;
  label: string;
  description: string;
  default_title: string;
  default_width: 1 | 2 | 3;
};

/** The widgets the "Add widget" menu offers, in monday.com's order of popularity. */
export const WIDGET_TYPES: WidgetTypeOption[] = [
  { type: "chart", label: "Chart", description: "Bars, lines or pies of any column", default_title: "Chart", default_width: 1 },
  { type: "numbers", label: "Numbers", description: "One key number: a count, sum or average", default_title: "Numbers", default_width: 1 },
  { type: "battery", label: "Battery", description: "How much of the work is done", default_title: "Progress", default_width: 2 },
  { type: "status_overview", label: "Status overview", description: "Items per status label", default_title: "Status overview", default_width: 1 },
  { type: "workload", label: "Workload", description: "Who is working on how much", default_title: "Workload", default_width: 1 },
  { type: "table", label: "Table", description: "A compact list of items", default_title: "Items", default_width: 3 },
];

export const widgetTypeOption = (type: DashboardWidgetType): WidgetTypeOption =>
  WIDGET_TYPES.find((option) => option.type === type) ?? WIDGET_TYPES[0];

const randomId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? `w_${crypto.randomUUID().slice(0, 8)}` : `w_${Math.random().toString(36).slice(2, 10)}`;

/** A new widget of a type, reading the dashboard's own board until the user picks something else. */
export const defaultWidget = (type: DashboardWidgetType): DashboardWidget => {
  const option = widgetTypeOption(type);
  return {
    id: randomId(),
    type,
    title: option.default_title,
    width: option.default_width,
    source_board_id: null,
    source_view_id: null,
    config: type === "numbers" ? { function: "count" } : type === "chart" ? { chart_type: "bar", aggregate_fn: "count" } : type === "table" ? { limit: 10 } : {},
  };
};

export const NUMBERS_FUNCTION_LABEL: Record<string, string> = {
  count: "Count of items",
  sum: "Sum",
  average: "Average",
  min: "Lowest",
  max: "Highest",
};
