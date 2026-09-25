import type { MyWorkItemDto } from "@/types/personal";

export type MyWorkBucketKey = "past_dates" | "today" | "this_week" | "next_week" | "later" | "no_date" | "done";

export type MyWorkBucket = {
  key: MyWorkBucketKey;
  label: string;
  items: MyWorkItemDto[];
};

/** monday.com's My Work sections, in display order. */
export const MY_WORK_BUCKET_LABELS: Record<MyWorkBucketKey, string> = {
  past_dates: "Past dates",
  today: "Today",
  this_week: "This week",
  next_week: "Next week",
  later: "Later",
  no_date: "Without a date",
  done: "Done",
};

const BUCKET_ORDER: MyWorkBucketKey[] = ["past_dates", "today", "this_week", "next_week", "later", "no_date", "done"];

/** `YYYY-MM-DD` of a local calendar day, the same format dates are stored in. */
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const addDays = (date: Date, days: number): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * Which section an item belongs in, relative to `today` (local time). Weeks
 * run Monday to Sunday. Done items get their own section so they can be
 * hidden in one go.
 */
export const bucketFor = (item: MyWorkItemDto, today: Date): MyWorkBucketKey => {
  if (item.is_done) return "done";
  if (!item.date) return "no_date";

  const due = item.date.value.slice(0, 10);
  const today_key = toDateKey(today);
  if (due < today_key) return "past_dates";
  if (due === today_key) return "today";

  const days_since_monday = (today.getDay() + 6) % 7;
  const end_of_week = toDateKey(addDays(today, 6 - days_since_monday));
  const end_of_next_week = toDateKey(addDays(today, 13 - days_since_monday));

  if (due <= end_of_week) return "this_week";
  if (due <= end_of_next_week) return "next_week";
  return "later";
};

/**
 * Splits items into My Work's sections, dropping empty ones. Items inside a
 * section are sorted by due date, then by name.
 */
export const bucketMyWork = (items: MyWorkItemDto[], today: Date, options: { include_done: boolean }): MyWorkBucket[] => {
  const grouped = new Map<MyWorkBucketKey, MyWorkItemDto[]>();

  for (const item of items) {
    const key = bucketFor(item, today);
    if (key === "done" && !options.include_done) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return BUCKET_ORDER.filter((key) => grouped.has(key)).map((key) => ({
    key,
    label: MY_WORK_BUCKET_LABELS[key],
    items: (grouped.get(key) ?? []).sort(
      (a, b) => (a.date?.value ?? "9999").localeCompare(b.date?.value ?? "9999") || a.name.localeCompare(b.name)
    ),
  }));
};
