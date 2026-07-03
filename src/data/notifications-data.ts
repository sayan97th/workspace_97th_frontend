/**
 * Static data backing the Notifications drawer opened from the AppTopBar bell.
 * Mirrors the approved 97 Workspace design. Notifications are intentionally
 * decoupled from the presentation layer so the same list can later be fed from
 * the API without touching the components.
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
  /** Tailwind gradient utilities used to paint the circular avatar. */
  avatar_gradient: string;
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

/** Seed notifications matching the approved design. */
export const workspace_notifications: WorkspaceNotification[] = [
  {
    id: "blake-team-blake",
    actor: { name: "Blake", avatar_gradient: "from-[#5b7c99] to-[#2e4257]" },
    action_label: "Subscribed you",
    action_target: 'to the Board "Team Blake"',
    board: { name: "Team Blake", color: "#e53e2e" },
    time_label: "16 days",
    is_unread: true,
    category: "subscribed",
  },
  {
    id: "jaecie-client-hub",
    actor: { name: "Jaecie", avatar_gradient: "from-[#c98a6b] to-[#8a4a34]" },
    action_label: "Subscribed you",
    action_target: 'to the Board "Client Hub"',
    board: { name: "Client Hub", color: "#e53e2e" },
    time_label: "17 days",
    is_unread: true,
    category: "subscribed",
  },
  {
    id: "jaecie-team-jaecie",
    actor: { name: "Jaecie", avatar_gradient: "from-[#c98a6b] to-[#8a4a34]" },
    action_label: "Subscribed you",
    action_target: 'to the Board "Team Jaecie"',
    board: { name: "Team Jaecie", color: "#e53e2e" },
    time_label: "17 days",
    is_unread: true,
    category: "subscribed",
  },
  {
    id: "amanda-sales-resources",
    actor: { name: "Amanda McKay", avatar_gradient: "from-[#8a7cc9] to-[#4a3a8a]" },
    action_label: "Subscribed you",
    action_target: 'to the Board "Sales Resources"',
    board: { name: "Sales Resources", color: "#e53e2e" },
    time_label: "17 days",
    is_unread: true,
    category: "subscribed",
  },
  {
    id: "priya-mention-sprints",
    actor: { name: "Priya Sharma", avatar_gradient: "from-[#6b9c8a] to-[#347a5a]" },
    action_label: "Mentioned you",
    action_target: 'in a comment on "Sprint 42"',
    board: { name: "Sprints", color: "#ecaa17" },
    time_label: "2 days",
    is_unread: true,
    category: "mentioned",
  },
  {
    id: "daniel-assigned-research",
    actor: { name: "Daniel Cortez", avatar_gradient: "from-[#9c6ba0] to-[#5a347a]" },
    action_label: "Assigned you",
    action_target: 'to the task "Research RAG for Palomar"',
    board: { name: "Client Hub", color: "#e53e2e" },
    time_label: "3 days",
    is_unread: false,
    category: "assigned",
  },
];
