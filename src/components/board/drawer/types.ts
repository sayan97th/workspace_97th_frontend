import type { ReactNode } from "react";
import type { BoardPersonOption } from "../toolbar/types";

/** A single emoji reaction pill on a comment or reply, with its live tally. */
export type DrawerReaction = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type DrawerAttachmentTag = "PDF" | "DOC" | "XLS" | "IMG" | "PPT" | "FILE";

export type DrawerAttachment = {
  id: string;
  file_name: string;
  tag: DrawerAttachmentTag;
  tag_color: string;
  /** Present once the attachment is actually uploaded (real boards); absent for a composer's not-yet-posted draft. */
  download_url?: string;
};

/** A reply nested under a top-level comment. */
export type DrawerReply = {
  id: string;
  author: BoardPersonOption;
  posted_at: string;
  body: string;
  view_count: number;
  liked_by_me: boolean;
  like_count: number;
  reactions: DrawerReaction[];
};

/** A top-level comment ("update"), which additionally tracks seen state, attachments and replies. */
export type DrawerComment = DrawerReply & {
  seen: boolean;
  attachments: DrawerAttachment[];
  replies: DrawerReply[];
};

export type DrawerActivityEntry = {
  id: string;
  actor: BoardPersonOption;
  verb: string;
  occurred_at: string;
  accent_color: string;
};

export type DrawerInfoBoxRow = {
  label: string;
  value: string;
};

export type DrawerInfoBox = {
  id: string;
  label: string;
  accent_color: string;
  rows: DrawerInfoBoxRow[];
};

export type DrawerTabId = "updates" | "files" | "activity" | "info_boxes";

/**
 * One editable row in the drawer's "Details" strip (Status/Priority/Due
 * date/People, …) shown above the tabs. The caller owns rendering the
 * editor itself (typically a `BoardValueCell`) — the drawer just lays out
 * the label/value grid, mirroring how `BoardTable`'s `renderCell` and
 * `BoardKanban`'s `renderCard` keep cell content with the caller.
 */
export type DrawerDetailField = {
  id: string;
  label: string;
  content: ReactNode;
};

/** Which composer a `@mention` picker or emoji palette is currently open for: the top-level composer, or a reply box keyed by its parent comment id. */
export type DrawerComposerTarget = "composer" | string;

/** Board-specific configuration a caller supplies to {@link useBoardItemDrawer}. Generic over the row type so any board view can reuse it. */
export type BoardItemDrawerConfig<TRow> = {
  getRowId: (row: TRow) => string;
  getRowTitle: (row: TRow) => string;
  /** Breadcrumb-style label shown above the item title, e.g. "Client Hub · Item". */
  eyebrow_label: string;
  /** Accent stripe + active-tab underline colour. Defaults to "#00c875". */
  accent_color?: string;
  current_user: BoardPersonOption;
  mentionable_people: BoardPersonOption[];
  /** Seeds a row's comment thread the first time its drawer is opened. Ignored when {@link board_id} is set. */
  getInitialComments: (row: TRow) => DrawerComment[];
  /**
   * When set, comments/replies/likes/reactions/seen-state/attachments are
   * persisted through `boardCommentsService` against this real board id
   * instead of using `getInitialComments`'s local mock data. Omit to keep a
   * board fully client-side (e.g. Client Hub).
   */
  board_id?: number;
  getInfoBoxes?: (row: TRow) => DrawerInfoBox[];
  getActivityLog?: (row: TRow) => DrawerActivityEntry[];
  /** Editable Status/Priority/Due date/People rows shown above the tabs — omit to hide the strip entirely (e.g. Client Hub, which stays mock data). */
  getDetailFields?: (row: TRow) => DrawerDetailField[];
  /** Seeds the description textarea's initial value — omit to hide the field entirely. */
  getDescription?: (row: TRow) => string;
  /** Persists a debounced description edit — required alongside {@link getDescription} for the field to be editable rather than read-only. */
  onDescriptionChange?: (row_id: string, description: string) => void;
};

/** Full live state + actions returned by {@link useBoardItemDrawer}. */
export type BoardItemDrawerApi<TRow> = BoardItemDrawerConfig<TRow> & {
  is_open: boolean;
  open_row_id: string | null;
  open_row_title: string;
  active_tab: DrawerTabId;

  openRow: (row: TRow) => void;
  close: () => void;
  setActiveTab: (tab: DrawerTabId) => void;

  comments: DrawerComment[];
  /** True while a real board's comments are being fetched (only ever set when {@link BoardItemDrawerConfig.board_id} is present). */
  comments_loading: boolean;
  /** Set when a comment/reply/like/reaction/seen/attachment request against a real board fails. */
  comments_error: string | null;
  /** Every attachment across `comments` (top-level only), flattened for the Files tab. */
  all_attachments: DrawerAttachment[];
  info_boxes: DrawerInfoBox[];
  activity_log: DrawerActivityEntry[];
  detail_fields: DrawerDetailField[];

  /** Live draft (reflects unsaved keystrokes immediately; persisted on a debounce). Empty when neither {@link BoardItemDrawerConfig.getDescription} nor an open row is set. */
  description: string;
  /** True when {@link BoardItemDrawerConfig.getDescription} is configured — gates whether the drawer renders the field at all. */
  has_description: boolean;
  onDescriptionChange: (value: string) => void;

  composer_text: string;
  composer_attachments: DrawerAttachment[];
  onComposerTextChange: (value: string) => void;
  postComment: () => void;
  addComposerAttachments: (files: File[]) => void;
  removeComposerAttachment: (attachment_id: string) => void;

  reply_text_by_comment: Record<string, string>;
  onReplyTextChange: (comment_id: string, value: string) => void;
  postReply: (comment_id: string) => void;

  mention_target: DrawerComposerTarget | null;
  mention_matches: BoardPersonOption[];
  pickMention: (person: BoardPersonOption) => void;

  emoji_palette_target: DrawerComposerTarget | null;
  toggleEmojiPalette: (target: DrawerComposerTarget) => void;
  closeEmojiPalette: () => void;
  insertEmoji: (emoji: string) => void;

  reaction_palette_id: string | null;
  toggleReactionPalette: (id: string) => void;
  toggleReaction: (comment_id: string, reply_id: string | null, emoji: string) => void;

  toggleLike: (comment_id: string, reply_id?: string) => void;
  toggleSeen: (comment_id: string) => void;
};

/** Emoji options offered by every insert/react palette in the drawer. */
export const DRAWER_EMOJI_OPTIONS: string[] = [
  "👍", "❤️", "😄", "🎉", "😍", "😂", "🙏", "🔥", "👀", "✅", "💯", "🚀",
];
