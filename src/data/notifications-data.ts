/**
 * Types and copy backing the Notifications drawer opened from the AppTopBar
 * bell. Notification entries themselves come from the API (see
 * `src/types/notifications.ts` and `useNotifications`), this module only
 * holds the shared shapes and static tab/copy strings.
 */

/** Which filter tab a notification belongs to (beyond the catch-all "All"). */
export type NotificationCategory = "mentioned" | "assigned" | "replies" | "reactions" | "subscribed";

/** Identifier of a tab in the drawer header. */
export type NotificationTabId = "all" | "mentioned" | "assigned" | "replies" | "reactions" | "saved";

/** A tab shown in the drawer header. */
export type NotificationTab = {
  id: NotificationTabId;
  label: string;
};

/** The person who triggered the notification. */
export type NotificationActor = {
  /** Backend user id, absent for system notifications and deleted users. */
  id?: string;
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
  /** Backend board id, absent for notifications that are not scoped to a board. */
  id?: string;
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
  /** Kept in the Saved tab, and out of "Mark all as read", until the person removes it. */
  is_saved: boolean;
  category: NotificationCategory;
  /** Frontend route to navigate to on click, e.g. `/boards/12`. */
  link?: string;
  /** Raw ISO timestamp, used to bucket the list into date sections (Today/Yesterday/This week/Older). */
  created_at: string;
  /** Notifications of the same type on the same thread share a key, so the drawer can collapse them into one card. */
  group_key: string;
};

/** The server-side filters the drawer applies to its list. */
export type NotificationFilters = {
  tab: NotificationTabId;
  /** Free-text search over actor and board names. */
  search: string;
  unread_only: boolean;
  board_id: string | null;
  actor_id: string | null;
};

export const default_notification_filters: NotificationFilters = {
  tab: "all",
  search: "",
  unread_only: false,
  board_id: null,
  actor_id: null,
};

/** A board or person offered by the drawer's filter menus. */
export type NotificationFilterOption = {
  id: string;
  name: string;
};

/** Boards and people that appear somewhere in the user's notifications. */
export type NotificationFilterOptions = {
  boards: NotificationFilterOption[];
  actors: NotificationFilterOption[];
};

/** A "Remind me later" choice in a notification's menu. */
export type NotificationSnoozePresetId = "one_hour" | "three_hours" | "tomorrow" | "next_week";

export const notification_snooze_presets: { id: NotificationSnoozePresetId; label: string }[] = [
  { id: "one_hour", label: "In 1 hour" },
  { id: "three_hours", label: "In 3 hours" },
  { id: "tomorrow", label: "Tomorrow morning" },
  { id: "next_week", label: "Next week" },
];

const SNOOZE_MORNING_HOUR = 9;

/** When a snooze preset resolves to, relative to `now`. "Tomorrow morning" and "Next week" (the coming Monday) land at 9:00 local time. */
export function resolveSnoozeDate(preset: NotificationSnoozePresetId, now: Date = new Date()): Date {
  const result = new Date(now);
  if (preset === "one_hour") result.setHours(result.getHours() + 1);
  else if (preset === "three_hours") result.setHours(result.getHours() + 3);
  else if (preset === "tomorrow") result.setDate(result.getDate() + 1);
  else result.setDate(result.getDate() + (((8 - result.getDay()) % 7) || 7));

  if (preset === "tomorrow" || preset === "next_week") result.setHours(SNOOZE_MORNING_HOUR, 0, 0, 0);
  return result;
}

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
  { id: "assigned", label: "Assigned" },
  { id: "replies", label: "Replies" },
  { id: "reactions", label: "Reactions" },
  { id: "saved", label: "Saved" },
];

/** Placeholder for the search input in the drawer header. */
export const notification_search_placeholder =
  "Search notifications by people, boards…";

/**
 * Whether a notification that just arrived over the websocket belongs in the
 * list under `filters`, so the live list agrees with what a fresh
 * `GET /api/notifications` for the same filters would return.
 */
export function matchesNotificationFilters(notification: WorkspaceNotification, filters: NotificationFilters): boolean {
  if (filters.tab === "saved") {
    if (!notification.is_saved) return false;
  } else if (filters.tab !== "all" && notification.category !== filters.tab) return false;
  if (filters.unread_only && !notification.is_unread) return false;
  if (filters.board_id && notification.board.id !== filters.board_id) return false;
  if (filters.actor_id && notification.actor.id !== filters.actor_id) return false;

  const needle = filters.search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${notification.actor.name} ${notification.board.name}`.toLowerCase();
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}

/** What is waiting for the person, shown as the summary card at the top of the drawer. */
export type NotificationSummary = {
  unread_count: number;
  mentions: number;
  replies: number;
  assigned: number;
  reactions: number;
  due_reminders: number;
  today_count: number;
  saved_count: number;
  snoozed_count: number;
  top_actors: { id: number; name: string; avatar_url: string | null; count: number }[];
};
