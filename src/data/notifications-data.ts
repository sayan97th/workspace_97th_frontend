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
};

/** Tabs shown in the drawer header, in display order. */
export const notification_tabs: NotificationTab[] = [
  { id: "all", label: "All" },
  { id: "mentioned", label: "Mentioned" },
  { id: "assigned", label: "Assigned to me" },
];

/** Section heading shown above the list. */
export const notification_group_label = "Older Notifications";

/** Copy for the dismissible board-mute hint card. */
export const notification_mute_hint =
  "Mute notifications from specific boards using the 3-dot menu within the notification.";

/** Placeholder for the search input in the drawer header. */
export const notification_search_placeholder =
  "Search notifications by people, boards…";
