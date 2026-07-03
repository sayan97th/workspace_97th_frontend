/**
 * Static data backing the Update feed drawer opened from the AppTopBar feed
 * button. Mirrors the approved 97 Workspace design. Like the notifications
 * drawer, the feed is intentionally decoupled from the presentation layer so the
 * same list can later be fed from the API without touching the components.
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

/** How a single run of message text should be painted. */
export type FeedMessageVariant = "text" | "link" | "mention";

/** An inline run of message text (plain, link or @mention chip). */
export type FeedMessageSegment = {
  text: string;
  variant?: FeedMessageVariant;
};

/** A single feed update rendered as a card in the list. */
export type FeedUpdate = {
  id: string;
  actor: FeedActor;
  /** Absolute date label, e.g. "Apr 2024". */
  date_label: string;
  breadcrumb: FeedBreadcrumb;
  /** Message body as paragraphs of inline segments. */
  paragraphs: FeedMessageSegment[][];
  /** Optional read/view count shown bottom-right of the body. */
  view_count?: number;
  is_unread: boolean;
  /** Which tabs (beyond the catch-all "all") this update belongs to. */
  categories: UpdateFeedTabId[];
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
export const update_feed_default_tab: UpdateFeedTabId = "mentioned";

/** Board filters shown in the feed left sidebar, in display order. */
export const feed_board_filters: FeedBoardFilter[] = [
  { id: "all-boards", name: "All boards in my feed", count: 8 },
  { id: "sprints", name: "Sprints", count: 8 },
];

/** Filter shown selected when the drawer first opens. */
export const feed_default_board_filter = "all-boards";

/** Small helper copy shown under the drawer title. */
export const feed_helper_prompt = "What goes in my feed?";

/** Placeholder for the inline reply composer. */
export const feed_reply_placeholder = "Write a reply and mention others with @";

/** Gradient for the signed-in user's avatar in the reply composer. */
export const feed_reply_avatar_gradient = "from-[#e5623e] to-[#8a2018]";

/** Seed updates matching the approved design. */
export const workspace_feed_updates: FeedUpdate[] = [
  {
    id: "rag-palomar-transcripts",
    actor: { name: "Josh Moody", avatar_gradient: "from-[#5b7c99] to-[#2e4257]" },
    date_label: "Apr 2024",
    breadcrumb: {
      board_color: "#e53e2e",
      crumbs: [
        "Sprints",
        "Sprint 42 (April 8–19)",
        "Research RAG for Palomar Transcripts",
      ],
    },
    paragraphs: [
      [
        { text: "The idea is that we put data like " },
        { text: "this", variant: "link" },
        {
          text: " in a database. Then, we use an LLM to query the data via natural language. The best way to do this seems to be Retrieval Augmented Generation (RAG).",
        },
      ],
      [
        { text: "@Ernesto McIntosh Afane", variant: "mention" },
        { text: " Can you experiment/research with how we could do this?" },
      ],
    ],
    view_count: 1,
    is_unread: true,
    categories: ["mentioned"],
    show_actions: true,
    show_composer: true,
  },
  {
    id: "keyword-clustering-prompt",
    actor: { name: "Josh Moody", avatar_gradient: "from-[#5b7c99] to-[#2e4257]" },
    date_label: "Dec 2023",
    breadcrumb: {
      board_color: "#e53e2e",
      crumbs: [
        "Sprints",
        "Sprint 45 (Dec 4–15)",
        "Send Ernesto Updated Prompt for Keyword Clustering",
      ],
    },
    paragraphs: [
      [
        { text: "@Ernesto McIntosh Afane", variant: "mention" },
        {
          text: " For the keyword clustering, here is what we need to add to the GPT prompt.",
        },
      ],
    ],
    is_unread: true,
    categories: ["mentioned"],
  },
  {
    id: "sprint-planning-recap",
    actor: { name: "Priya Sharma", avatar_gradient: "from-[#6b9c8a] to-[#347a5a]" },
    date_label: "Jun 2026",
    breadcrumb: {
      board_color: "#ecaa17",
      crumbs: ["Sprints", "Sprint 51 (June 2–13)", "Sprint Planning Recap"],
    },
    paragraphs: [
      [
        {
          text: "Recap from today's planning: we locked the RAG spike, the keyword clustering rework and the client hub filters. Full notes bookmarked ",
        },
        { text: "here", variant: "link" },
        { text: "." },
      ],
    ],
    is_unread: false,
    categories: ["bookmarked", "account"],
    show_actions: true,
  },
  {
    id: "billing-account-update",
    actor: { name: "Amanda McKay", avatar_gradient: "from-[#8a7cc9] to-[#4a3a8a]" },
    date_label: "May 2026",
    breadcrumb: {
      board_color: "#e53e2e",
      crumbs: ["Client Hub", "Account", "Q2 Contract Renewal"],
    },
    paragraphs: [
      [
        {
          text: "The Q2 contract renewal is signed and the new seats are provisioned across the account.",
        },
      ],
    ],
    is_unread: false,
    categories: ["account"],
    show_actions: true,
  },
];
