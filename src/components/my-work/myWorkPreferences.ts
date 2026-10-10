import type { MyWorkGroupBy, MyWorkSort, MyWorkSortKey } from "./myWorkBuckets";

/** The optional columns, in display order. The item name column is always shown. */
export type MyWorkColumnKey = "updates" | "group" | "board" | "people" | "date" | "status" | "priority";

export type MyWorkColumn = {
  key: MyWorkColumnKey;
  label: string;
  /** Fixed width in pixels. */
  width: number;
  /** Column the header sorts by, null when it does not sort. */
  sort_key: MyWorkSortKey | null;
};

export const MY_WORK_COLUMNS: MyWorkColumn[] = [
  { key: "updates", label: "Updates", width: 64, sort_key: null },
  { key: "group", label: "Group", width: 180, sort_key: "group" },
  { key: "board", label: "Board", width: 210, sort_key: "board" },
  { key: "people", label: "People", width: 120, sort_key: "people" },
  { key: "date", label: "Date", width: 140, sort_key: "date" },
  { key: "status", label: "Status", width: 140, sort_key: "status" },
  { key: "priority", label: "Priority", width: 140, sort_key: "priority" },
];

/** Smallest width of the item name column, it takes whatever space is left above that. */
export const MY_WORK_NAME_MIN_WIDTH = 420;

export type MyWorkTab = "table" | "calendar";

export type MyWorkPreferences = {
  tab: MyWorkTab;
  group_by: MyWorkGroupBy;
  sort: MyWorkSort;
  hidden_columns: MyWorkColumnKey[];
  hide_done: boolean;
  /** Board the last item was created on, preselected in "New item". */
  last_board_id: number | null;
};

export const DEFAULT_MY_WORK_PREFERENCES: MyWorkPreferences = {
  tab: "table",
  group_by: "date",
  sort: { key: "date", direction: "asc" },
  hidden_columns: [],
  hide_done: false,
  last_board_id: null,
};

const STORAGE_KEY = "my_work_preferences";

/** The page's saved layout. A missing or broken entry falls back to the defaults. */
export const readMyWorkPreferences = (): MyWorkPreferences => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<MyWorkPreferences> | null;
    return stored ? { ...DEFAULT_MY_WORK_PREFERENCES, ...stored } : DEFAULT_MY_WORK_PREFERENCES;
  } catch {
    return DEFAULT_MY_WORK_PREFERENCES;
  }
};

export const writeMyWorkPreferences = (preferences: MyWorkPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Only affects whether the layout survives a reload.
  }
};

/** `grid-template-columns` for a section: the flexible name column, then every visible column. */
export const buildColumnTemplate = (columns: MyWorkColumn[]): string =>
  [`minmax(${MY_WORK_NAME_MIN_WIDTH}px, 1fr)`, ...columns.map((column) => `${column.width}px`)].join(" ");

/** Total width the rows need, used as the scroll area's minimum width. */
export const minimumRowWidth = (columns: MyWorkColumn[]): number =>
  columns.reduce((total, column) => total + column.width, MY_WORK_NAME_MIN_WIDTH);
