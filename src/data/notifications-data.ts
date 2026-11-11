/**
 * Types and copy backing the Notifications drawer opened from the AppTopBar
 * bell. Notification entries themselves come from the API (see
 * `src/types/notifications.ts` and `useNotifications`), this module only
 * holds the shared shapes and static tab/copy strings.
 */

/** Which filter tab a notification belongs to (beyond the catch-all "All"). */
export type NotificationCategory = "mentioned" | "assigned" | "replies" | "reactions" | "subscribed";

/** Identifier of a tab in the drawer header. */
export type NotificationTabId = "all" | "unread" | "mentioned" | "assigned" | "replies" | "reactions" | "saved";

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
  /** The actor's account was disabled or deleted, so their avatar and name are shown faded. */
  is_deactivated?: boolean;
  /** Sent by "Automations" (an automation or a reminder), shown with the app logo instead of a person. */
  is_system?: boolean;
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
  /** Backend notification type (`mentioned`, `assigned`, `replied_thread`...), picks the icon in front of the action. */
  type: string;
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
  /** The viewer liked the comment behind it, what the card's Like button shows. Only meaningful when `reply_to` is set. */
  is_liked: boolean;
  category: NotificationCategory;
  /** Frontend route to navigate to on click, e.g. `/boards/12`. */
  link?: string;
  /** Plain text excerpt of the message behind it, shown under the sentence like monday's notification center. */
  preview?: string;
  /** Name of the item it is about, the card footer reads "11m · Task 1" (the board name when there is no item). */
  item_name?: string;
  /** The item the notification is about, what "Mute this item" targets. Absent for a board level notification. */
  board_item_id?: number;
  /** The viewer muted that item, so nothing new about it arrives. */
  is_item_muted: boolean;
  /** Feed id of the comment that triggered it, what the inline quick reply attaches to. Absent when there is nothing to reply to. */
  reply_to?: string;
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

/** A person offered by the drawer's "Filter by person" menu. */
export type NotificationFilterOption = {
  id: string;
  name: string;
  /** Profile photo, shown next to the name in the list. */
  avatar_url?: string;
  is_deactivated?: boolean;
};

/** People that appear somewhere in the user's notifications. */
export type NotificationFilterOptions = {
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

/** Tabs shown in the drawer header, in display order. */
export const notification_tabs: NotificationTab[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentioned", label: "I was mentioned" },
  { id: "assigned", label: "Assigned to me" },
  { id: "saved", label: "Saved" },
];

/** Placeholder for the search input in the drawer header. */
export const notification_search_placeholder =
  "Search all notifications";

/**
 * Whether a notification that just arrived over the websocket belongs in the
 * list under `filters`, so the live list agrees with what a fresh
 * `GET /api/notifications` for the same filters would return.
 */
export function matchesNotificationFilters(notification: WorkspaceNotification, filters: NotificationFilters): boolean {
  if (filters.tab === "saved") {
    if (!notification.is_saved) return false;
  } else if (filters.tab === "unread") {
    if (!notification.is_unread) return false;
  } else if (filters.tab !== "all" && notification.category !== filters.tab) return false;
  if (filters.unread_only && !notification.is_unread) return false;
  if (filters.board_id && notification.board.id !== filters.board_id) return false;
  if (filters.actor_id && notification.actor.id !== filters.actor_id) return false;

  const needle = filters.search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [notification.actor.name, notification.board.name, notification.action_target, notification.preview ?? ""].join(" ").toLowerCase();
  return needle.split(/\s+/).every((term) => haystack.includes(term));
}
