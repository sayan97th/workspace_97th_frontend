/**
 * Types and copy backing the Notifications drawer opened from the AppTopBar
 * bell. Notification entries themselves come from the API (see
 * `src/types/notifications.ts` and `useNotifications`), this module only
 * holds the shared shapes and static tab/copy strings.
 */

/** Which filter tab a notification belongs to (beyond the catch-all "All"). */
export type NotificationCategory = "mentioned" | "assigned" | "subscribed";

/** Identifier of a tab in the drawer header. */
export type NotificationTabId = "all" | "mentioned" | "assigned";

/** A tab shown in the drawer header. */
export type NotificationTab = {
  id: NotificationTabId;
  label: string;
};

/** The person who triggered the notification. */
export type NotificationActor = {
  name: string;
  /** Up to two uppercase initials, shown when there is no `avatar_url`. */
  initials: string;
  /** Tailwind gradient utilities used to paint the circular avatar fallback. */
  avatar_gradient: string;
  /** Real uploaded profile photo, when available — preferred over the initials fallback. */
  avatar_url?: string;
};

/** The board a notification is scoped to. */
export type NotificationBoard = {
  name: string;
  /** Hex color used for the small square board chip. */
  color: string;
};

/** A single notification entry rendered as a card in the list. */
export type WorkspaceNotification = {
  id: string;
  actor: NotificationActor;
  /** Highlighted action phrase, e.g. "Subscribed you". */
  action_label: string;
  /** Trailing sentence after the action, e.g. `to the Board "Team Blake"`. */
  action_target: string;
  board: NotificationBoard;
  /** Relative time label, e.g. "16 days". */
  time_label: string;
  is_unread: boolean;
  category: NotificationCategory;
  /** Frontend route to navigate to on click, e.g. `/boards/12`. */
  link?: string;
  /** Raw ISO timestamp, used to bucket the list into date sections (Today/Yesterday/This week/Older). */
  created_at: string;
};

/** One of the list's date-grouped sections. */
export type NotificationDateGroup = "today" | "yesterday" | "this_week" | "older";

const NOTIFICATION_DATE_GROUP_LABELS: Record<NotificationDateGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  older: "Older",
};

/** Buckets a notification's raw `created_at` into a date section for the drawer's grouped list. */
export function notificationDateGroupOf(created_at: string): NotificationDateGroup {
  const date = new Date(created_at);
  const now = new Date();
  const start_of_today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start_of_yesterday = new Date(start_of_today);
  start_of_yesterday.setDate(start_of_yesterday.getDate() - 1);
  const start_of_week = new Date(start_of_today);
  start_of_week.setDate(start_of_week.getDate() - 7);

  if (date >= start_of_today) return "today";
  if (date >= start_of_yesterday) return "yesterday";
  if (date >= start_of_week) return "this_week";
  return "older";
}

/** Display order + label for each date group. */
export const notification_date_groups: { id: NotificationDateGroup; label: string }[] = (
  ["today", "yesterday", "this_week", "older"] as const
).map((id) => ({ id, label: NOTIFICATION_DATE_GROUP_LABELS[id] }));

/** Tabs shown in the drawer header, in display order. */
export const notification_tabs: NotificationTab[] = [
  { id: "all", label: "All" },
  { id: "mentioned", label: "Mentioned" },
  { id: "assigned", label: "Assigned to me" },
];

/** Placeholder for the search input in the drawer header. */
export const notification_search_placeholder =
  "Search notifications by people, boards…";
