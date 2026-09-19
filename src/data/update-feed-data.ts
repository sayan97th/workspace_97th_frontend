/**
 * Types and copy backing the Update feed drawer opened from the AppTopBar
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
  | "scheduled";

/** Optional leading glyph for a tab, resolved to an icon in the panel. */
export type UpdateFeedTabIcon = "mention" | "bookmark";

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
};

/** Someone `@mentioned` in an update, so hovering the mention can show who they are. */
export type FeedMention = {
  id: string;
  name: string;
  avatar_url?: string;
};

/** The board/sprint/item trail an update is scoped to. */
export type FeedBreadcrumb = {
  /** Hex color used for the small square board chip. */
  board_color: string;
  /** Crumbs from board to item; the last crumb is emphasized as the title. */
  crumbs: string[];
};

/** A single feed update rendered as a card in the list. */
export type FeedUpdate = {
  id: string;
  actor: FeedActor;
  /** Relative date label, e.g. "2 days ago". */
  date_label: string;
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
  /** Which tabs (beyond the catch-all "all") this update belongs to. */
  categories: UpdateFeedTabId[];
  /** Frontend route to navigate to when the card (or its breadcrumb) is opened. */
  link?: string;
  /** Shows the Like / Reply action footer. */
  show_actions?: boolean;
  /** Shows the inline reply composer row. */
  show_composer?: boolean;
};

/** Tabs shown in the feed content header, in display order. */
export const update_feed_tabs: UpdateFeedTab[] = [
  { id: "all", label: "All updates" },
  { id: "mentioned", label: "I was mentioned", icon: "mention" },
  { id: "bookmarked", label: "Bookmarked", icon: "bookmark" },
  { id: "account", label: "All account" },
  { id: "scheduled", label: "Scheduled", is_new: true },
];

/** Tab shown selected when the drawer first opens. */
export const update_feed_default_tab: UpdateFeedTabId = "all";

/** Synthetic sidebar row id meaning "no board filter applied". */
export const feed_default_board_filter = "all-boards";

/** Small helper copy shown under the drawer title. */
export const feed_helper_prompt = "What goes in my feed?";

/** Placeholder for the inline reply composer. */
export const feed_reply_placeholder = "Write a reply and mention others with @";

/** How many updates a feed page holds. */
export const feed_page_size = 20;
