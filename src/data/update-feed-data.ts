import type { DrawerLiker, DrawerReaction } from "@/components/board/drawer/types";

/**
 * Types and copy backing the Update feed (Inbox) modal opened from the AppTopBar
 * feed button. Entries themselves come from the API (see `src/types/feed.ts`
 * and `useFeedUpdates`); this module only holds the shared shapes and static
 * tab/copy strings, mirroring `src/data/notifications-data.ts`.
 */

/** Identifier of a tab in the feed content header. */
export type UpdateFeedTabId =
  | "all"
  | "mentioned"
  | "bookmarked"
  | "account"
  | "following"
  | "pinned"
  | "scheduled";

/** Optional leading glyph for a tab, resolved to an icon in the panel. */
export type UpdateFeedTabIcon = "mention" | "bookmark" | "following" | "pin" | "account";

/** A tab shown in the feed content header. */
export type UpdateFeedTab = {
  id: UpdateFeedTabId;
  label: string;
  icon?: UpdateFeedTabIcon;
  /** Renders the small "New" pill after the label. */
  is_new?: boolean;
};

/** A board filter row in the feed left sidebar. */
export type FeedBoardFilter = {
  id: string;
  name: string;
  /** Number of updates the board contributes to the feed. */
  count: number;
  /** Updates on the board the viewer has not seen yet and that concern them. */
  unread_count: number;
};

/** A board the viewer hid from their inbox, listed in Feed settings so it can be shown again. */
export type FeedHiddenBoard = {
  id: string;
  name: string;
};

/** Whether the feed lists top-level updates or only replies. */
export type FeedKindFilter = "updates" | "replies";

/** The server-side filters the feed applies on top of its tab and board. */
export type FeedFilters = {
  /** Free-text search over the update body and the author's name. */
  search: string;
  author_id: string | null;
  kind: FeedKindFilter | null;
  /** First day to include, `YYYY-MM-DD` in the viewer's own time zone. */
  from: string | null;
  /** Last day to include, `YYYY-MM-DD`. */
  to: string | null;
  unread_only: boolean;
};

export const default_feed_filters: FeedFilters = {
  search: "",
  author_id: null,
  kind: null,
  from: null,
  to: null,
  unread_only: false,
};

/** How many filters are narrowing the feed, for the "Filters" button badge. */
export function countActiveFeedFilters(filters: FeedFilters): number {
  return [
    filters.search.trim() !== "",
    filters.author_id !== null,
    filters.kind !== null,
    filters.from !== null || filters.to !== null,
    filters.unread_only,
  ].filter(Boolean).length;
}

/** A person the feed's author filter offers. */
export type FeedAuthorOption = {
  id: string;
  name: string;
};

/** A named combination of tab, board and filters the viewer saved, from `GET /api/feed/saved-views`. */
export type FeedSavedView = {
  id: number;
  name: string;
  tab: UpdateFeedTabId;
  board_id: string;
  filters: FeedFilters;
};

/** A quick date range offered next to the custom From and To pickers. */
export type FeedDatePresetId = "today" | "last_7_days" | "last_30_days";

export const feed_date_presets: { id: FeedDatePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "last_7_days", label: "Last 7 days" },
  { id: "last_30_days", label: "Last 30 days" },
];

const toDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** The `from` and `to` days a date preset resolves to, relative to `now`. */
export function resolveFeedDatePreset(preset: FeedDatePresetId, now: Date = new Date()): { from: string; to: string } {
  const start = new Date(now);
  if (preset === "last_7_days") start.setDate(start.getDate() - 6);
  if (preset === "last_30_days") start.setDate(start.getDate() - 29);
  return { from: toDateInputValue(start), to: toDateInputValue(now) };
}

/** The person who authored a feed update. */
export type FeedActor = {
  /** Backend user id, absent for deleted users. */
  id?: string;
  name: string;
  /** Up to two uppercase initials, shown when there is no `avatar_url`. */
  initials: string;
  /** Picks the fallback gradient, so a person keeps the same color everywhere. */
  avatar_seed: number;
  /** Real uploaded profile photo, when available. */
  avatar_url?: string;
  /** The author's account was disabled or deleted, so their avatar and name are shown faded. */
  is_deactivated?: boolean;
  /** "Automations": an automation posted the update, shown with the app logo instead of a person. */
  is_system?: boolean;
};

/** Someone `@mentioned` in an update, so hovering the mention can show who they are. */
export type FeedMention = {
  id: string;
  name: string;
  avatar_url?: string;
  is_deactivated?: boolean;
};

/** The board/sprint/item trail an update is scoped to. */
export type FeedBreadcrumb = {
  /** Hex color used for the small square board chip. */
  board_color: string;
  /** Crumbs from board to item; the last crumb is emphasized as the title. */
  crumbs: string[];
};

/** One change to a cell of the update's item, such as a status moving from Working on it to Done. */
export type FeedActivityEntry = {
  id: string;
  actor: { id?: string; name: string; avatar_url?: string; is_deactivated?: boolean } | null;
  column_label: string;
  column_type: string;
  /** Text of the value before the change, null when the cell was empty. */
  old_display: string | null;
  new_display: string | null;
  /** Relative label, e.g. "3 hours ago". */
  time_label: string;
};

/**
 * A single feed update. A top-level update is rendered as a card, with every
 * reply to it inline under it in `replies` (monday.com's inbox layout). A
 * reply uses the same shape, with an empty `replies`.
 */
export type FeedUpdate = {
  id: string;
  /** The card this update shows in: its own id for a top-level update, its parent's for a reply. */
  thread_id: string;
  actor: FeedActor;
  /** Relative date label, e.g. "2 days ago". */
  date_label: string;
  /** Raw ISO time it was posted, for the full date tooltip. */
  created_at: string;
  /** ISO time of the last edit, absent when it was never edited. */
  edited_at?: string;
  breadcrumb: FeedBreadcrumb;
  /** Raw comment body (sanitized HTML) — rendered via `RichTextContent`. */
  body: string;
  /** People `@mentioned` in the body. */
  mentions: FeedMention[];
  /** Board the update lives on, used to load who can be mentioned in a reply. */
  board_id: string;
  /** Optional read/view count shown bottom-right of the body. */
  view_count?: number;
  is_unread: boolean;
  /** A reply to another update rather than a top-level one. */
  is_reply: boolean;
  is_bookmarked: boolean;
  pinned: boolean;
  /** The item the update is on, absent for a board-wide update. */
  item_id?: string;
  /** Whether the viewer follows this update's item, or its board, which is what fills the Following tab. */
  is_following_item: boolean;
  is_following_board: boolean;
  /** Changes made to the item since the previous update on it, newest first (only for top-level item updates). */
  activity: FeedActivityEntry[];
  /** How many changes there were in total, which can exceed the entries sent. */
  activity_total: number;
  /** How many people liked it, and whether the viewer is one of them. */
  like_count: number;
  liked_by_me: boolean;
  /** Everyone who liked it, oldest first, for the Like hover card. */
  likers?: DrawerLiker[];
  /** One pill per emoji, with who reacted, for the reactions row. */
  reactions: DrawerReaction[];
  /** Which tabs (beyond the catch-all "all") this update belongs to. */
  categories: UpdateFeedTabId[];
  /** Frontend route to navigate to when the card (or its breadcrumb) is opened. */
  link?: string;
  /** Shows the Like / Reply action footer. */
  show_actions?: boolean;
  /** Shows the inline reply composer row. */
  show_composer?: boolean;
  /** The thread's replies, oldest first, shown inline under the update. Always empty on a reply. */
  replies: FeedUpdate[];
};

/** Tabs shown in the inbox header, in display order, the same four monday.com offers. */
export const update_feed_tabs: UpdateFeedTab[] = [
  { id: "all", label: "All updates" },
  { id: "mentioned", label: "I was mentioned", icon: "mention" },
  { id: "bookmarked", label: "Bookmarked", icon: "bookmark" },
  { id: "account", label: "All account updates", icon: "account" },
];

/** What the "Show" picker above the cards offers: only unread threads, or every thread. */
export type FeedShowMode = "unread" | "all";

export const feed_show_options: { id: FeedShowMode; label: string }[] = [
  { id: "unread", label: "Unread updates" },
  { id: "all", label: "All updates" },
];

/** The inbox opens on unread updates, as in monday.com. */
export const feed_default_show_mode: FeedShowMode = "unread";

/** What each tab lists, for the "What goes in my update feed?" card. */
export const feed_tab_help: { title: string; description: string }[] = [
  { title: "All updates", description: "Updates from boards you are subscribed to." },
  { title: "I was mentioned", description: "Only updates you were @mentioned in." },
  { title: "Bookmarked", description: "All updates that you bookmarked for later." },
  { title: "All account updates", description: "Updates from every board in your account, even if you are not subscribed." },
];

/** Tab shown selected when the drawer first opens. */
export const update_feed_default_tab: UpdateFeedTabId = "all";

/** Synthetic sidebar row id meaning "no board filter applied". */
export const feed_default_board_filter = "all-boards";

/** Small helper copy shown under the drawer title. */
export const feed_helper_prompt = "What goes in my update feed?";

/** Placeholder for the inline reply composer. */
export const feed_reply_placeholder = "Write a reply...";

/** How many updates a feed page holds. */
export const feed_page_size = 20;
