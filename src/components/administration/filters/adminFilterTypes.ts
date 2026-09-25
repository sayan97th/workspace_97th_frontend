import { format, subDays } from "date-fns";
import type { BoardPersonOption } from "@/components/board";

/**
 * Column filters for the Administration tables (Users, Sessions, Content directory, Tidy up).
 * Each column declares the kind of value it filters on, and that kind decides both the editor
 * shown in its popover and how the value is serialized into the API's query parameters:
 *
 *  - `multi_select`: pick any of a fixed list (role, status, department, workspace, owner,
 *    dropdown profile fields), sent as a comma separated list.
 *  - `date_range`: a preset ("Last 7 days", "More than 30 days ago") or a custom from/to,
 *    optionally "Never" for columns that can be empty (last active), sent as Y-m-d bounds.
 *  - `number_range`: min and/or max (item count, number profile fields).
 *  - `text`: "contains" (text profile fields).
 */

export type AdminFilterOption = {
  id: string;
  label: string;
  /** Status style color dot, e.g. for dropdown profile field options. */
  color?: string | null;
  /** Shows an avatar instead of a dot, for people columns. */
  person?: BoardPersonOption;
};

export type AdminDatePresetId =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "older_than_30_days"
  | "older_than_90_days"
  | "custom";

type AdminFilterDefBase = {
  /** Stable key in the filter state, unique per table. */
  key: string;
  /** Column label, shown on the filter button. */
  label: string;
};

export type AdminMultiSelectFilterDef = AdminFilterDefBase & {
  kind: "multi_select";
  options: AdminFilterOption[];
  /** Query parameter that receives the comma separated ids. */
  param: string;
};

export type AdminDateRangeFilterDef = AdminFilterDefBase & {
  kind: "date_range";
  from_param: string;
  to_param: string;
  /** When set, offers a "Never" choice sent as `{never_param}=1`. */
  never_param?: string;
  never_label?: string;
  /** Defaults to every preset. "Future" style presets are never offered. */
  presets?: AdminDatePresetId[];
};

export type AdminNumberRangeFilterDef = AdminFilterDefBase & {
  kind: "number_range";
  min_param: string;
  max_param: string;
};

export type AdminTextFilterDef = AdminFilterDefBase & {
  kind: "text";
  param: string;
  placeholder?: string;
};

export type AdminFilterDef =
  | AdminMultiSelectFilterDef
  | AdminDateRangeFilterDef
  | AdminNumberRangeFilterDef
  | AdminTextFilterDef;

export type AdminMultiSelectValue = { kind: "multi_select"; values: string[] };
export type AdminDateRangeValue = { kind: "date_range"; preset: AdminDatePresetId | null; from: string; to: string; never: boolean };
export type AdminNumberRangeValue = { kind: "number_range"; min: string; max: string };
export type AdminTextValue = { kind: "text"; text: string };

export type AdminFilterValue = AdminMultiSelectValue | AdminDateRangeValue | AdminNumberRangeValue | AdminTextValue;

/** Current value per filter key. A missing key means "not filtered". */
export type AdminFilterState = Record<string, AdminFilterValue>;

export const DATE_PRESET_LABELS: Record<AdminDatePresetId, string> = {
  today: "Today",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  older_than_30_days: "More than 30 days ago",
  older_than_90_days: "More than 90 days ago",
  custom: "Custom range",
};

export const ALL_DATE_PRESETS: AdminDatePresetId[] = [
  "today",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "older_than_30_days",
  "older_than_90_days",
  "custom",
];

export const emptyFilterValue = (def: AdminFilterDef): AdminFilterValue => {
  switch (def.kind) {
    case "multi_select":
      return { kind: "multi_select", values: [] };
    case "date_range":
      return { kind: "date_range", preset: null, from: "", to: "", never: false };
    case "number_range":
      return { kind: "number_range", min: "", max: "" };
    default:
      return { kind: "text", text: "" };
  }
};

export const isFilterValueActive = (value: AdminFilterValue | undefined): boolean => {
  if (!value) return false;
  switch (value.kind) {
    case "multi_select":
      return value.values.length > 0;
    case "date_range":
      return value.never || (value.preset !== null && value.preset !== "custom") || value.from !== "" || value.to !== "";
    case "number_range":
      return value.min.trim() !== "" || value.max.trim() !== "";
    default:
      return value.text.trim() !== "";
  }
};

export const countActiveFilters = (state: AdminFilterState): number =>
  Object.values(state).filter((value) => isFilterValueActive(value)).length;

const toYmd = (date: Date): string => format(date, "yyyy-MM-dd");

/** Resolves a date preset (relative to today) or a custom range into Y-m-d bounds. */
export const resolveDateRange = (value: AdminDateRangeValue): { from: string; to: string } => {
  const today = new Date();
  switch (value.preset) {
    case "today":
      return { from: toYmd(today), to: toYmd(today) };
    case "last_7_days":
      return { from: toYmd(subDays(today, 6)), to: "" };
    case "last_30_days":
      return { from: toYmd(subDays(today, 29)), to: "" };
    case "last_90_days":
      return { from: toYmd(subDays(today, 89)), to: "" };
    case "older_than_30_days":
      return { from: "", to: toYmd(subDays(today, 30)) };
    case "older_than_90_days":
      return { from: "", to: toYmd(subDays(today, 90)) };
    default:
      return { from: value.from, to: value.to };
  }
};

/** Serializes every active filter into the query parameters the API expects. */
export const serializeFilters = (defs: AdminFilterDef[], state: AdminFilterState): Record<string, string> => {
  const params: Record<string, string> = {};

  for (const def of defs) {
    const value = state[def.key];
    if (!value || !isFilterValueActive(value) || value.kind !== def.kind) continue;

    if (def.kind === "multi_select" && value.kind === "multi_select") {
      params[def.param] = value.values.join(",");
    } else if (def.kind === "date_range" && value.kind === "date_range") {
      const range = resolveDateRange(value);
      if (range.from) params[def.from_param] = range.from;
      if (range.to) params[def.to_param] = range.to;
      if (value.never && def.never_param) params[def.never_param] = "1";
    } else if (def.kind === "number_range" && value.kind === "number_range") {
      if (value.min.trim() !== "") params[def.min_param] = value.min.trim();
      if (value.max.trim() !== "") params[def.max_param] = value.max.trim();
    } else if (def.kind === "text" && value.kind === "text") {
      params[def.param] = value.text.trim();
    }
  }

  return params;
};

const formatShortDate = (ymd: string): string => {
  const date = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(date.getTime()) ? ymd : format(date, "MMM d, yyyy");
};

/** Short human summary of a filter's value, shown on its button ("Admin, Staff", "Last 7 days"). */
export const describeFilterValue = (def: AdminFilterDef, value: AdminFilterValue | undefined): string | null => {
  if (!value || !isFilterValueActive(value)) return null;

  if (def.kind === "multi_select" && value.kind === "multi_select") {
    const labels = value.values.map((id) => def.options.find((option) => option.id === id)?.label ?? id);
    return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
  }

  if (def.kind === "date_range" && value.kind === "date_range") {
    const parts: string[] = [];
    if (value.preset && value.preset !== "custom") {
      parts.push(DATE_PRESET_LABELS[value.preset]);
    } else if (value.from || value.to) {
      if (value.from && value.to) parts.push(`${formatShortDate(value.from)} to ${formatShortDate(value.to)}`);
      else if (value.from) parts.push(`Since ${formatShortDate(value.from)}`);
      else parts.push(`Until ${formatShortDate(value.to)}`);
    }
    if (value.never) parts.push(def.never_label ?? "Never");
    return parts.join(" or ");
  }

  if (def.kind === "number_range" && value.kind === "number_range") {
    const min = value.min.trim();
    const max = value.max.trim();
    if (min && max) return `${min} to ${max}`;
    return min ? `At least ${min}` : `At most ${max}`;
  }

  if (value.kind === "text") return `Contains "${value.text.trim()}"`;

  return null;
};
