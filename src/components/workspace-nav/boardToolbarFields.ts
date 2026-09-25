import { format, parseISO, startOfWeek } from "date-fns";
import {
  BOARD_DEFAULT_GROUP_BY_ID,
  BOARD_EMPTY_GROUP_KEY,
  BOARD_FILTER_GROUP_FIELD_ID,
  COLUMN_KIND_SWATCH,
  type BoardFilterField,
  type BoardFilterFieldKind,
  type BoardGroupByOption,
  type BoardPersonOption,
  type BoardQuickFilterFacetOption,
  type BoardSortOption,
} from "@/components/board";
import type {
  BoardColumnDto,
  BoardGroupDto,
  BoardItemDto,
  BoardItemValue,
  BoardLinkValue,
  BoardTagDto,
  BoardTimelineValue,
  BoardTimeTrackingValue,
} from "@/types/board-content";

/**
 * Maps the board engine's typed columns onto the toolbar's generic filter,
 * sort and group-by descriptions. Every column type gets the filter family
 * (see `BoardFilterFieldKind`) whose conditions and value picker fit its data,
 * and the API's `BoardItemFilterService` applies the same mapping server-side.
 */

const FILTER_KIND_BY_COLUMN_TYPE: Partial<Record<BoardColumnDto["type"], BoardFilterFieldKind>> = {
  status: "option",
  label: "option",
  dropdown: "option",
  tags: "option",
  people: "people",
  vote: "people",
  date: "date",
  timeline: "date",
  number: "number",
  rating: "number",
  progress: "number",
  auto_number: "number",
  time_tracking: "number",
  checkbox: "checkbox",
  text: "text",
  long_text: "text",
  email: "text",
  phone: "text",
  link: "text",
  files: "text",
  mirror: "text",
  checklist: "text",
  // Formula results are computed while rendering, and Dependency/Connect
  // board hold item ids, so none of them is filterable yet.
};

const RATING_OPTIONS: BoardQuickFilterFacetOption[] = [5, 4, 3, 2, 1].map((stars) => ({
  id: String(stars),
  label: stars === 1 ? "1 star" : `${stars} stars`,
  dot_color: "#fdab3d",
}));

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const toDay = (value: unknown): string | null =>
  typeof value === "string" && DAY_PATTERN.test(value) ? value.slice(0, 10) : null;

const isEmptyValue = (value: BoardItemValue | undefined) =>
  value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

/** Every id a multi or single value cell holds, as strings. */
export const getValueIds = (column: BoardColumnDto, value: BoardItemValue | undefined): string[] => {
  if (isEmptyValue(value)) return [];
  if (column.type === "status" || column.type === "label") return [String(value)];
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [String(value)];
};

export const getValueNumber = (column: BoardColumnDto, value: BoardItemValue | undefined): number | null => {
  if (isEmptyValue(value)) return null;
  if (column.type === "time_tracking") {
    const seconds = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as BoardTimeTrackingValue).seconds : null;
    // Filtered and sorted in hours, the unit people type into a filter.
    return typeof seconds === "number" && seconds > 0 ? Math.round((seconds / 3600) * 100) / 100 : null;
  }
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
};

export const getValueDateRange = (
  column: BoardColumnDto,
  value: BoardItemValue | undefined
): { start: string; end: string } | null => {
  if (column.type === "timeline") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const timeline = value as BoardTimelineValue;
    const start = toDay(timeline.start) ?? toDay(timeline.end);
    const end = toDay(timeline.end) ?? start;
    return start && end ? { start, end } : null;
  }
  const day = toDay(value);
  return day ? { start: day, end: day } : null;
};

export const isValueChecked = (value: BoardItemValue | undefined): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

type OptionLookup = { id: string; label: string; color: string; position: number };

/** Option id to label/color/position for a Status, Label, Dropdown or Tags column (Tags options are board wide). */
const buildOptionLookup = (column: BoardColumnDto, tags: BoardTagDto[]): Map<string, OptionLookup> => {
  if (column.type === "tags") {
    return new Map(tags.map((tag, index) => [String(tag.id), { id: String(tag.id), label: tag.label, color: tag.color, position: index }]));
  }
  return new Map(
    (column.config?.options ?? []).map((option, index) => [
      option.id,
      { id: option.id, label: option.label, color: option.color, position: index },
    ])
  );
};

export type BoardToolbarFieldSources = {
  item_columns: BoardColumnDto[];
  groups: BoardGroupDto[];
  tags: BoardTagDto[];
  persons: BoardPersonOption[];
  people_names_by_id: Record<string, string>;
  item_column_id: string;
  item_column_label: string;
  getColumnText: (row: BoardItemDto, column_id: string) => string;
};

/** Filterable fields in picker order: the item Name, the board's Group, then every filterable column. */
export function buildBoardFilterFields(sources: BoardToolbarFieldSources): BoardFilterField<BoardItemDto>[] {
  const { item_columns, groups, tags, persons, item_column_id, item_column_label, getColumnText } = sources;
  const person_options = persons.map((person) => ({ id: person.id, label: person.name, person_id: person.id }));

  const name_field: BoardFilterField<BoardItemDto> = {
    id: item_column_id,
    label: item_column_label,
    kind: "text",
    swatch: { accent_color: "#7e5bef", glyph: "It" },
    getText: (row) => row.name,
  };

  const group_field: BoardFilterField<BoardItemDto> = {
    id: BOARD_FILTER_GROUP_FIELD_ID,
    label: "Group",
    kind: "group",
    swatch: { accent_color: "#5b6180", glyph: "Gr" },
    options: groups.map((group) => ({ id: String(group.id), label: group.name, dot_color: group.accent_color })),
    getText: (row) => groups.find((group) => group.id === row.group_id)?.name ?? "",
    getOptionIds: (row) => [String(row.group_id)],
  };

  const column_fields = item_columns.flatMap((column): BoardFilterField<BoardItemDto>[] => {
    const kind = FILTER_KIND_BY_COLUMN_TYPE[column.type];
    if (!kind) return [];
    const column_id = String(column.id);
    const base = {
      id: column_id,
      label: column.label,
      kind,
      swatch: COLUMN_KIND_SWATCH[column.type],
      getText: (row: BoardItemDto) => getColumnText(row, column_id),
    };
    switch (kind) {
      case "option": {
        const lookup = buildOptionLookup(column, tags);
        return [
          {
            ...base,
            options: Array.from(lookup.values()).map((option) => ({ id: option.id, label: option.label, dot_color: option.color })),
            getOptionIds: (row) => getValueIds(column, row.values[column_id]),
          },
        ];
      }
      case "people":
        return [{ ...base, options: person_options, getOptionIds: (row) => getValueIds(column, row.values[column_id]) }];
      case "number":
        return [
          {
            ...base,
            options: column.type === "rating" ? RATING_OPTIONS : undefined,
            // Auto numbers are unique per item, so a Quick filters facet of them would be noise.
            is_quick_filterable: column.type !== "auto_number",
            getNumber: (row) => getValueNumber(column, row.values[column_id]),
          },
        ];
      case "date":
        return [{ ...base, getDateRange: (row) => getValueDateRange(column, row.values[column_id]) }];
      case "checkbox":
        return [{ ...base, getChecked: (row) => isValueChecked(row.values[column_id]) }];
      case "text":
      default:
        return [base];
    }
  });

  return [name_field, group_field, ...column_fields];
}

/**
 * Sort values per column type: Status/Label/Dropdown/Tags by the column's own
 * option order (not alphabetically), dates chronologically, people by name,
 * numbers numerically. Empty cells return null, which always sorts last.
 */
export function buildBoardSortOptions(sources: BoardToolbarFieldSources): BoardSortOption<BoardItemDto>[] {
  const { item_columns, tags, people_names_by_id, item_column_id, getColumnText } = sources;
  return [
    { id: item_column_id, label: "Name", getValue: (row) => row.name || null },
    ...item_columns.map((column): BoardSortOption<BoardItemDto> => {
      const column_id = String(column.id);
      const lookup = buildOptionLookup(column, tags);
      const getValue = (row: BoardItemDto): string | number | null => {
        const value = row.values[column_id];
        if (isEmptyValue(value)) return null;
        switch (column.type) {
          case "status":
          case "label":
          case "dropdown":
          case "tags": {
            const positions = getValueIds(column, value)
              .map((id) => lookup.get(id)?.position)
              .filter((position): position is number => position !== undefined);
            return positions.length ? Math.min(...positions) : null;
          }
          case "people":
          case "vote":
            return getValueIds(column, value)
              .map((id) => people_names_by_id[id] ?? id)
              .sort((a, b) => a.localeCompare(b))
              .join(", ") || null;
          case "date":
          case "timeline": {
            const range = getValueDateRange(column, value);
            // Timed dates keep their time so two items on the same day still order correctly.
            return column.type === "date" && typeof value === "string" ? value : range?.start ?? null;
          }
          case "number":
          case "rating":
          case "progress":
          case "auto_number":
          case "time_tracking":
            return getValueNumber(column, value);
          case "checkbox":
            return isValueChecked(value) ? 1 : 0;
          case "link": {
            const link = value as BoardLinkValue;
            return link.text || link.url || null;
          }
          default:
            return getColumnText(row, column_id) || null;
        }
      };
      return { id: column_id, label: column.label, swatch: COLUMN_KIND_SWATCH[column.type], getValue };
    }),
  ];
}

type DateBucket = "day" | "week" | "month";

const DATE_BUCKET_LABELS: Record<DateBucket, string> = { day: "day", week: "week", month: "month" };

const toDateBucketKey = (day: string, bucket: DateBucket): string => {
  if (bucket === "day") return day;
  if (bucket === "month") return day.slice(0, 7);
  return format(startOfWeek(parseISO(day), { weekStartsOn: 1 }), "yyyy-MM-dd");
};

const formatDateBucketLabel = (key: string, bucket: DateBucket): string => {
  if (bucket === "month") return format(parseISO(`${key}-01`), "MMMM yyyy");
  const label = format(parseISO(key), "MMM d, yyyy");
  return bucket === "week" ? `Week of ${label}` : label;
};

/**
 * Group-by options: the board's own groups ("Default tables"), then one or
 * more per column type. Dates offer day, week and month buckets (ids such as
 * `12:month`), multi-value columns group by their exact combination.
 */
export function buildBoardGroupByOptions(sources: BoardToolbarFieldSources): BoardGroupByOption<BoardItemDto>[] {
  const { item_columns, tags, people_names_by_id } = sources;
  const options: BoardGroupByOption<BoardItemDto>[] = [{ id: BOARD_DEFAULT_GROUP_BY_ID, label: "Default tables" }];

  for (const column of item_columns) {
    const column_id = String(column.id);
    const swatch = COLUMN_KIND_SWATCH[column.type];

    switch (column.type) {
      case "status":
      case "label":
      case "dropdown":
      case "tags": {
        const lookup = buildOptionLookup(column, tags);
        if (!lookup.size) break;
        const is_single = column.type === "status" || column.type === "label";
        const empty_label = column.type === "status" ? "No status" : "No value";
        options.push({
          id: column_id,
          label: `By ${column.label}`,
          swatch,
          getGroupKey: (row) => {
            const ids = getValueIds(column, row.values[column_id]).filter((id) => lookup.has(id));
            if (!ids.length) return BOARD_EMPTY_GROUP_KEY;
            return is_single ? ids[0] : ids.sort((a, b) => (lookup.get(a)!.position - lookup.get(b)!.position)).join("|");
          },
          getGroupLabel: (key) =>
            key === BOARD_EMPTY_GROUP_KEY ? empty_label : key.split("|").map((id) => lookup.get(id)?.label ?? id).join(", "),
          getGroupColor: (key) => lookup.get(key.split("|")[0])?.color ?? "#c4c4c4",
          getGroupSortValue: (key) => lookup.get(key.split("|")[0])?.position ?? Number.MAX_SAFE_INTEGER,
        });
        break;
      }
      case "people":
      case "vote":
        options.push({
          id: column_id,
          label: `By ${column.label}`,
          swatch,
          getGroupKey: (row) => {
            const ids = getValueIds(column, row.values[column_id]).sort();
            return ids.length ? ids.join("|") : BOARD_EMPTY_GROUP_KEY;
          },
          getGroupLabel: (key) =>
            key === BOARD_EMPTY_GROUP_KEY ? "Unassigned" : key.split("|").map((id) => people_names_by_id[id] ?? id).join(", "),
          getGroupColor: () => "#a358df",
          getGroupSortValue: (key) => key.split("|").map((id) => people_names_by_id[id] ?? id).join(", ").toLowerCase(),
        });
        break;
      case "checkbox":
        options.push({
          id: column_id,
          label: `By ${column.label}`,
          swatch,
          getGroupKey: (row) => (isValueChecked(row.values[column_id]) ? "checked" : "unchecked"),
          getGroupLabel: (key) => (key === "checked" ? "Checked" : "Unchecked"),
          getGroupColor: (key) => (key === "checked" ? "#00c875" : "#c4c4c4"),
          getGroupSortValue: (key) => (key === "checked" ? 0 : 1),
        });
        break;
      case "rating":
        options.push({
          id: column_id,
          label: `By ${column.label}`,
          swatch,
          getGroupKey: (row) => {
            const number = getValueNumber(column, row.values[column_id]);
            return number === null ? BOARD_EMPTY_GROUP_KEY : String(Math.round(number));
          },
          getGroupLabel: (key) => (key === BOARD_EMPTY_GROUP_KEY ? "No rating" : key === "1" ? "1 star" : `${key} stars`),
          getGroupColor: () => "#fdab3d",
          getGroupSortValue: (key) => -Number(key),
        });
        break;
      case "date":
      case "timeline": {
        const buckets: DateBucket[] = column.type === "date" ? ["day", "week", "month"] : ["week", "month"];
        for (const bucket of buckets) {
          options.push({
            id: `${column_id}:${bucket}`,
            label: `By ${column.label} (${DATE_BUCKET_LABELS[bucket]})`,
            swatch,
            getGroupKey: (row) => {
              const range = getValueDateRange(column, row.values[column_id]);
              return range ? toDateBucketKey(range.start, bucket) : BOARD_EMPTY_GROUP_KEY;
            },
            getGroupLabel: (key) => (key === BOARD_EMPTY_GROUP_KEY ? "No date" : formatDateBucketLabel(key, bucket)),
            getGroupColor: () => "#579bfc",
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return options;
}
