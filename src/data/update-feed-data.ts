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
};

/** The person who authored a feed update. */
export type FeedActor = {
  name: string;
  /** Tailwind gradient utilities used to paint the circular avatar. */
  avatar_gradient: string;
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
  /** Raw comment body — mention highlighting is applied at render time via `renderMentionText`. */
  body: string;
  /** Optional read/view count shown bottom-right of the body. */
  view_count?: number;
  is_unread: boolean;
  is_bookmarked: boolean;
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

/** Gradient for the signed-in user's avatar in the reply composer. */
export const feed_reply_avatar_gradient = "from-[#e5623e] to-[#8a2018]";
