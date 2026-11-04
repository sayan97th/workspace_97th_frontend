import { addDays, bucketFor, toDateKey } from "@/components/my-work/myWorkBuckets";
import type { MyWorkItemDto } from "@/types/personal";

/**
 * The My work tabs Home shows: the three date sections that need attention
 * now, plus everything due after this week so longer work can be planned.
 */
export type HomeWorkTab = "past_dates" | "today" | "this_week" | "upcoming";

export const HOME_WORK_TABS: { key: HomeWorkTab; label: string; color: string }[] = [
  { key: "past_dates", label: "Overdue", color: "#e2445c" },
  { key: "today", label: "Due today", color: "#00c875" },
  { key: "this_week", label: "This week", color: "#579bfc" },
  { key: "upcoming", label: "Upcoming", color: "#784bd1" },
];

/** How many items a My work tab lists before linking to the full page. */
export const HOME_WORK_LIMIT = 6;

export type HomeWorkSummary = Record<HomeWorkTab, MyWorkItemDto[]>;

export const greetingFor = (date: Date): string => {
  const hour = date.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/** "just now", "5m ago", "3h ago", "2d ago", then the plain date after a week. */
export const relativeTime = (iso: string, now: Date = new Date()): string => {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** "Sep 18" for a `YYYY-MM-DD` due date, read as a local day. */
export const formatDueDate = (value: string): string =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Open items split into the Overdue, Due today, This week and Upcoming tabs, soonest first. */
export const buildWorkSummary = (items: MyWorkItemDto[], today: Date): HomeWorkSummary => {
  const summary: HomeWorkSummary = { past_dates: [], today: [], this_week: [], upcoming: [] };
  for (const item of items) {
    if (item.is_done) continue;
    const bucket = bucketFor(item, today);
    if (bucket === "past_dates" || bucket === "today" || bucket === "this_week") summary[bucket].push(item);
    else if (bucket === "next_week" || bucket === "later") summary.upcoming.push(item);
  }
  for (const key of Object.keys(summary) as HomeWorkTab[]) {
    summary[key].sort((a, b) => (a.date?.value ?? "").localeCompare(b.date?.value ?? ""));
  }
  return summary;
};

/** The first tab with something in it, so Home opens on what matters most. Upcoming only wins when nothing is due sooner. */
export const firstBusyTab = (summary: HomeWorkSummary): HomeWorkTab =>
  HOME_WORK_TABS.find((tab) => summary[tab.key].length > 0)?.key ?? "today";

const plural = (count: number, singular: string, plural_form = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural_form}`;

const joinParts = (parts: string[]): string =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/** The hero's one line recap of the day, e.g. "You have 2 overdue items and 3 unread notifications." */
export const buildDayRecap = (counts: { overdue: number; today: number; unread: number }): string => {
  const parts: string[] = [];
  if (counts.overdue > 0) parts.push(plural(counts.overdue, "overdue item"));
  if (counts.today > 0) parts.push(`${plural(counts.today, "item")} due today`);
  if (counts.unread > 0) parts.push(plural(counts.unread, "unread notification"));
  if (parts.length === 0) return "You're all caught up. Nothing is due today, enjoy the calm.";
  return `You have ${joinParts(parts)}.`;
};

/* ── Upcoming ──────────────────────────────────────────────────────────── */

/** How far ahead the Upcoming tab looks, picked in its toolbar. */
export type UpcomingHorizon = "two_weeks" | "month" | "quarter" | "all";

export const UPCOMING_HORIZONS: { key: UpcomingHorizon; label: string; title: string; days: number | null }[] = [
  { key: "two_weeks", label: "2 weeks", title: "Due in the next 2 weeks", days: 14 },
  { key: "month", label: "30 days", title: "Due in the next 30 days", days: 30 },
  { key: "quarter", label: "90 days", title: "Due in the next 90 days", days: 90 },
  { key: "all", label: "All", title: "Everything due after this week", days: null },
];

export const DEFAULT_UPCOMING_HORIZON: UpcomingHorizon = "all";

/** How many Upcoming rows show before "Show more". */
export const HOME_UPCOMING_LIMIT = 8;

/** Upcoming items due within the horizon, counted from today. */
export const filterByHorizon = (items: MyWorkItemDto[], horizon: UpcomingHorizon, today: Date): MyWorkItemDto[] => {
  const days = UPCOMING_HORIZONS.find((option) => option.key === horizon)?.days ?? null;
  if (days === null) return items;
  const last_key = toDateKey(addDays(today, days));
  return items.filter((item) => (item.date?.value.slice(0, 10) ?? "") <= last_key);
};

/** One heading of the Upcoming list: next week, the rest of this month, then one per month. */
export type UpcomingGroup = {
  key: string;
  label: string;
  /** "Nov 9 to Nov 15" under Next week, null for a month. */
  hint: string | null;
  items: MyWorkItemDto[];
};

const monthLabel = (date: Date, today: Date): string =>
  date.toLocaleDateString(undefined, date.getFullYear() === today.getFullYear() ? { month: "long" } : { month: "long", year: "numeric" });

/**
 * Splits Upcoming items (already sorted by due date) into Next week, then
 * "Later in <this month>", then one group per month, so long range work
 * reads like a roadmap.
 */
export const groupUpcoming = (items: MyWorkItemDto[], today: Date): UpcomingGroup[] => {
  const week_start = addDays(today, -((today.getDay() + 6) % 7));
  const next_week_start = addDays(week_start, 7);
  const next_week_end = addDays(week_start, 13);
  const next_week_end_key = toDateKey(next_week_end);
  const today_month_key = toDateKey(today).slice(0, 7);
  const groups = new Map<string, UpcomingGroup>();

  for (const item of items) {
    const due = item.date?.value.slice(0, 10);
    if (!due) continue;

    let key: string;
    let label: string;
    let hint: string | null = null;
    if (due <= next_week_end_key) {
      key = "next_week";
      label = "Next week";
      hint = `${formatDueDate(toDateKey(next_week_start))} to ${formatDueDate(next_week_end_key)}`;
    } else {
      key = due.slice(0, 7);
      const month_date = new Date(`${key}-01T00:00:00`);
      label = key === today_month_key ? `Later in ${monthLabel(month_date, today)}` : monthLabel(month_date, today);
    }

    const group = groups.get(key) ?? { key, label, hint, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()];
};

const dayDifference = (from_key: string, to_key: string): number =>
  Math.round((new Date(`${to_key}T00:00:00`).getTime() - new Date(`${from_key}T00:00:00`).getTime()) / 86_400_000);

/** "tomorrow", "in 9 days", "in 3 weeks", "in 2 months" for a due date after today. */
export const formatDueIn = (value: string, today: Date): string => {
  const days = dayDifference(toDateKey(today), value.slice(0, 10));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 21) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
};

/**
 * When the work on an item runs: its Timeline (or the Timeline its due date
 * comes from), ending on the due date. Null when the item only has a due
 * date, or when the start is not before it.
 */
export type WorkRange = {
  start: string;
  end: string;
  /** Share of the range already behind today, 0 before it starts, 1 once it is over. */
  progress: number;
  phase: "not_started" | "in_progress" | "ended";
};

export const workRangeOf = (item: MyWorkItemDto, today: Date): WorkRange | null => {
  const end = item.date?.value.slice(0, 10);
  const start = (item.date?.start ?? item.timeline?.start)?.slice(0, 10);
  if (!end || !start || start >= end) return null;

  const today_key = toDateKey(today);
  const total_days = dayDifference(start, end);
  const elapsed_days = dayDifference(start, today_key);
  const progress = Math.min(1, Math.max(0, elapsed_days / total_days));
  const phase = today_key < start ? "not_started" : today_key > end ? "ended" : "in_progress";
  return { start, end, progress, phase };
};

/** "Starts tomorrow", "Starts in 5 days", "Started Nov 2" for an item's work range. */
export const formatRangeStart = (range: WorkRange, today: Date): string => {
  if (range.phase !== "not_started") return `Started ${formatDueDate(range.start)}`;
  const days = dayDifference(toDateKey(today), range.start);
  if (days === 1) return "Starts tomorrow";
  if (days < 14) return `Starts in ${days} days`;
  return `Starts ${formatDueDate(range.start)}`;
};
