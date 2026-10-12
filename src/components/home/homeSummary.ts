import { bucketFor } from "@/components/my-work/myWorkBuckets";
import type { MyWorkItemDto } from "@/types/personal";

/** The My work tabs Home shows, the three date sections that need attention now. */
export type HomeWorkTab = "past_dates" | "today" | "this_week";

export const HOME_WORK_TABS: { key: HomeWorkTab; label: string; color: string }[] = [
  { key: "past_dates", label: "Overdue", color: "#e2445c" },
  { key: "today", label: "Due today", color: "#00c875" },
  { key: "this_week", label: "This week", color: "#579bfc" },
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

/** Open items split into the Overdue, Due today and This week tabs, soonest first. */
export const buildWorkSummary = (items: MyWorkItemDto[], today: Date): HomeWorkSummary => {
  const summary: HomeWorkSummary = { past_dates: [], today: [], this_week: [] };
  for (const item of items) {
    if (item.is_done) continue;
    const bucket = bucketFor(item, today);
    if (bucket === "past_dates" || bucket === "today" || bucket === "this_week") summary[bucket].push(item);
  }
  for (const key of Object.keys(summary) as HomeWorkTab[]) {
    summary[key].sort((a, b) => (a.date?.value ?? "").localeCompare(b.date?.value ?? ""));
  }
  return summary;
};

/** The first tab with something in it, so Home opens on what matters most. */
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
