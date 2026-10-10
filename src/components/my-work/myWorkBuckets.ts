import type { MyWorkItemDto } from "@/types/personal";

export type MyWorkBucketKey = "past_dates" | "today" | "this_week" | "next_week" | "later" | "no_date";

/** How the sections are built, the toolbar's "Date view" menu. */
export type MyWorkGroupBy = "date" | "board" | "status";

export type MyWorkSortKey = "name" | "group" | "board" | "people" | "date" | "status" | "priority";

export type MyWorkSort = { key: MyWorkSortKey; direction: "asc" | "desc" };

/** One section of the page: a date range, a board or a status. */
export type MyWorkSection = {
  key: string;
  label: string;
  /** Title and left bar color. */
  color: string;
  items: MyWorkItemDto[];
  /** Due date given to an item added from this section's "+ Add item", null when it has none. */
  new_item_date: string | null;
  /** Board preselected for an item added from this section. */
  new_item_board_id: number | null;
};

/** monday.com's My Work sections, in display order. */
export const MY_WORK_BUCKET_LABELS: Record<MyWorkBucketKey, string> = {
  past_dates: "Past Dates",
  today: "Today",
  this_week: "This week",
  next_week: "Next week",
  later: "Later",
  no_date: "Without a date",
};

/** Title and bar color of each date section, as monday.com shows them. */
export const MY_WORK_BUCKET_COLORS: Record<MyWorkBucketKey, string> = {
  past_dates: "#9d4b3c",
  today: "#037f4c",
  this_week: "#0086c0",
  next_week: "#5ac4f0",
  later: "#c9a227",
  // A theme token, the neutral section has to stay readable in dark mode.
  no_date: "var(--mw-neutral-section)",
};

export const MY_WORK_GROUP_BY_LABELS: Record<MyWorkGroupBy, string> = {
  date: "Date view",
  board: "Board view",
  status: "Status view",
};

const BUCKET_ORDER: MyWorkBucketKey[] = ["past_dates", "today", "this_week", "next_week", "later", "no_date"];

/** Gray of an empty Status cell and of sections without their own color. */
export const EMPTY_LABEL_COLOR = "#c4c4c4";

/** `YYYY-MM-DD` of a local calendar day, the same format dates are stored in. */
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Monday of the week `date` falls in. Weeks run Monday to Sunday. */
const startOfWeek = (date: Date): Date => addDays(date, -((date.getDay() + 6) % 7));

/** Which date section an item belongs in, relative to `today` (local time). */
export const bucketFor = (item: MyWorkItemDto, today: Date): MyWorkBucketKey => {
  if (!item.date) return "no_date";

  const due = item.date.value.slice(0, 10);
  const today_key = toDateKey(today);
  if (due < today_key) return "past_dates";
  if (due === today_key) return "today";

  const week_start = startOfWeek(today);
  if (due <= toDateKey(addDays(week_start, 6))) return "this_week";
  if (due <= toDateKey(addDays(week_start, 13))) return "next_week";
  return "later";
};

/**
 * The due date an item added under a date section gets, so it lands in that
 * same section: yesterday, today, the next day still in this week, next
 * Monday, the Monday after, or no date.
 */
export const newItemDateFor = (key: MyWorkBucketKey, today: Date): string | null => {
  const week_start = startOfWeek(today);
  switch (key) {
    case "past_dates":
      return toDateKey(addDays(today, -1));
    case "today":
      return toDateKey(today);
    case "this_week": {
      const tomorrow = addDays(today, 1);
      return tomorrow <= addDays(week_start, 6) ? toDateKey(tomorrow) : toDateKey(today);
    }
    case "next_week":
      return toDateKey(addDays(week_start, 7));
    case "later":
      return toDateKey(addDays(week_start, 14));
    default:
      return null;
  }
};

const sortValueOf = (item: MyWorkItemDto, key: MyWorkSortKey): string => {
  switch (key) {
    case "name":
      return item.name.toLowerCase();
    case "group":
      return item.group.name.toLowerCase();
    case "board":
      return item.board.label.toLowerCase();
    case "people":
      return item.people[0]?.full_name.toLowerCase() ?? "";
    case "status":
      return item.status?.label.toLowerCase() ?? "";
    case "priority":
      return item.priority?.label.toLowerCase() ?? "";
    default:
      return item.date?.value ?? "";
  }
};

/**
 * Sorts a section's rows by one column. Empty values always go last, and
 * ties fall back to the due date and then the name so the order is stable.
 */
export const sortMyWorkItems = (items: MyWorkItemDto[], sort: MyWorkSort): MyWorkItemDto[] => {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const value_a = sortValueOf(a, sort.key);
    const value_b = sortValueOf(b, sort.key);
    if (value_a !== value_b) {
      if (!value_a) return 1;
      if (!value_b) return -1;
      return value_a.localeCompare(value_b) * factor;
    }
    return (a.date?.value ?? "9999").localeCompare(b.date?.value ?? "9999") || a.name.localeCompare(b.name);
  });
};

/**
 * Splits items into My Work's date sections. Every section is returned, even
 * an empty one, the page shows those collapsed with "0 items".
 */
export const bucketMyWork = (items: MyWorkItemDto[], today: Date, sort: MyWorkSort): MyWorkSection[] => {
  const grouped = new Map<MyWorkBucketKey, MyWorkItemDto[]>(BUCKET_ORDER.map((key) => [key, []]));
  for (const item of items) grouped.get(bucketFor(item, today))?.push(item);

  return BUCKET_ORDER.map((key) => ({
    key,
    label: MY_WORK_BUCKET_LABELS[key],
    color: MY_WORK_BUCKET_COLORS[key],
    items: sortMyWorkItems(grouped.get(key) ?? [], sort),
    new_item_date: newItemDateFor(key, today),
    new_item_board_id: null,
  }));
};

/** One section per board, alphabetically. */
const groupByBoard = (items: MyWorkItemDto[], sort: MyWorkSort): MyWorkSection[] => {
  const grouped = new Map<number, MyWorkItemDto[]>();
  for (const item of items) grouped.set(item.board.id, [...(grouped.get(item.board.id) ?? []), item]);

  return [...grouped.entries()]
    .map(([board_id, board_items]) => ({
      key: `board_${board_id}`,
      label: board_items[0].board.label,
      color: board_items[0].board.workspace?.color ?? "#0073ea",
      items: sortMyWorkItems(board_items, sort),
      new_item_date: null,
      new_item_board_id: board_id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/** One section per status label, items without a status last. */
const groupByStatus = (items: MyWorkItemDto[], sort: MyWorkSort): MyWorkSection[] => {
  const grouped = new Map<string, MyWorkItemDto[]>();
  for (const item of items) {
    const key = item.status?.label.trim().toLowerCase() ?? "";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return [...grouped.entries()]
    .map(([key, status_items]) => ({
      key: `status_${key || "none"}`,
      label: status_items[0].status?.label || "No status",
      color: status_items[0].status?.color ?? EMPTY_LABEL_COLOR,
      items: sortMyWorkItems(status_items, sort),
      new_item_date: null,
      new_item_board_id: null,
    }))
    .sort((a, b) => (a.key === "status_none" ? 1 : b.key === "status_none" ? -1 : a.label.localeCompare(b.label)));
};

export const groupMyWork = (items: MyWorkItemDto[], group_by: MyWorkGroupBy, today: Date, sort: MyWorkSort): MyWorkSection[] => {
  if (group_by === "board") return groupByBoard(items, sort);
  if (group_by === "status") return groupByStatus(items, sort);
  return bucketMyWork(items, today, sort);
};
