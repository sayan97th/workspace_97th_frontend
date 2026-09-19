import type { BoardPersonOption } from "../toolbar/types";
import type { MentionOption } from "./mentionOptions";

/** A single emoji reaction pill on a comment or reply, with its live tally. */
export type DrawerReaction = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  /** Display names of everyone who reacted with this emoji (the current user shows as "You") — powers the pill's hover tooltip. */
  reactor_names: string[];
};

export type DrawerAttachmentTag = "PDF" | "DOC" | "XLS" | "IMG" | "PPT" | "FILE";

export type DrawerAttachment = {
  id: string;
  file_name: string;
  tag: DrawerAttachmentTag;
  tag_color: string;
  /** Present once the attachment is actually uploaded (real boards); absent for a composer's not-yet-posted draft. */
  download_url?: string;
  /** True for attachments uploaded directly onto the item — the only kind with a backend delete route today. Comment attachments are removed by deleting the comment itself. */
  can_delete?: boolean;
};

/** A reply nested under a top-level comment. */
export type DrawerReply = {
  id: string;
  author: BoardPersonOption;
  posted_at: string;
  /** Raw ISO timestamp `posted_at` was formatted from, only used to sort the merged Updates feed against `DrawerActivityEntry.occurred_at_iso` — absent on client-side-only mock data, which sorts as "now". */
  posted_at_iso?: string;
  body: string;
  /** True once the author has edited the body at least once. Absent on client-side-only mock data — treat as false. */
  is_edited?: boolean;
  /** When the body was last edited (ISO), absent on client-side-only mock data and on a comment that was never edited. */
  edited_at?: string;
  /** Ids of the people `@mentioned` in the body, for the "Mentions me" filter. Absent on client-side-only mock data. */
  mentioned_user_ids?: string[];
  view_count: number;
  liked_by_me: boolean;
  like_count: number;
  reactions: DrawerReaction[];
};

/** One earlier version of an edited comment or reply, for the "(edited)" history popover. */
export type DrawerCommentRevision = {
  id: string;
  /** Markdown, as it was before the edit that replaced it. */
  body: string;
  /** ISO time this version was written, when known. */
  written_at?: string;
  /** ISO time an edit replaced it. */
  replaced_at: string;
  /** Who made that edit. */
  editor?: BoardPersonOption;
};

/** An item another comment can link to with `#`, shown in the composer's reference picker. */
export type DrawerReferenceItem = {
  id: string;
  name: string;
  /** In-app route the reference links to, `/boards/{board_id}/pulses/{item_id}`. */
  href: string;
};

/** A top-level comment ("update"), which additionally tracks seen state, attachments and replies. */
export type DrawerComment = DrawerReply & {
  seen: boolean;
  /** Everyone who has viewed this update, for the live "seen by" avatar stack — empty on client-side-only mock data. */
  seen_by: BoardPersonOption[];
  /** True once pinned via the composer's pin action — pinned updates sort ahead of the rest of the thread. Absent (falsy) on client-side-only mock data. */
  pinned?: boolean;
  /** Ids of people explicitly flagged via "Notify", distinct from `@mentions` in the body. Absent on client-side-only mock data. */
  notified_user_ids?: string[];
  attachments: DrawerAttachment[];
  replies: DrawerReply[];
};

export type DrawerActivityEntry = {
  id: string;
  actor: BoardPersonOption;
  verb: string;
  occurred_at: string;
  /** Raw ISO timestamp `occurred_at` was formatted from, see `DrawerReply.posted_at_iso`. */
  occurred_at_iso?: string;
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

/** `"activity"` folded into `"updates"` (see `UpdatesPanel`'s merged feed) — no longer a separate tab. */
export type DrawerTabId = "updates" | "files" | "info_boxes";

/** Payload of the `item_comment_posted` broadcast, ids only (see `App\Events\ItemCommentPosted`). */
export type RemoteCommentEvent = {
  comment_id: number;
  parent_id: number | null;
  author_id: number | null;
};

/** Which composer a `@mention` picker or emoji palette is currently open for: the top-level composer, or a reply box keyed by its parent comment id. */
export type DrawerComposerTarget = "composer" | string;

export type DrawerActionFeedback = {
  tone: "success" | "error";
  message: string;
};

/** One table (group) an item can be moved into from the drawer's "Move to" menu. */
export type DrawerMoveGroupOption = {
  id: string;
  label: string;
};

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
  /** Seeds the description textarea's initial value — omit to hide the field entirely. */
  getDescription?: (row: TRow) => string;
  /** Persists a debounced description edit — required alongside {@link getDescription} for the field to be editable rather than read-only. */
  onDescriptionChange?: (row_id: string, description: string) => void;
  /**
   * Returns the freshest copy of `row` the caller currently holds. The drawer
   * keeps the row it was opened with, so without this its title, description
   * and info boxes would go stale once an action (e.g. "Move to group")
   * changes that row in the caller's own state.
   */
  resolveRow?: (row: TRow) => TRow;
  /** The id of the table (group) `row` currently sits in, lets "Move to group" leave the current table out of its list. */
  getRowGroupId?: (row: TRow) => string;
  /** Whether `row` is a top-level item rather than a subitem. Moving and archiving are only offered for top-level items, since a subitem's group follows its parent's. Defaults to true. */
  isTopLevelRow?: (row: TRow) => boolean;
  /** Items of the board a comment can link to by typing `#`. Omit to hide the reference picker. */
  reference_items?: { id: string; name: string }[];
  /** Tables the "Move to group" action can move the open item into. Omit to hide that action. */
  move_group_options?: DrawerMoveGroupOption[];
  /** Moves the item into another table of the same board. Rejecting surfaces an inline error in the move dialog. */
  onMoveItemToGroup?: (row_id: string, group_id: string) => Promise<void>;
  /** Moves the item (with its subitems) into a table of another board. Omit to hide "Move to board". */
  onMoveItemToBoard?: (row_id: string, target_board_id: number, target_group_id: number) => Promise<void>;
  /** Archives the item. Omit to hide "Archive". */
  onArchiveItem?: (row_id: string) => Promise<void>;
  /** Deletes the item. Omit to hide "Delete". */
  onDeleteItem?: (row_id: string) => Promise<void>;
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
  /** How many updates other people posted since the thread was loaded, shown as the "N new updates" pill. Always 0 for mock boards. */
  pending_update_count: number;
  /** Refetches the thread and folds in everything counted by {@link pending_update_count}. */
  loadPendingUpdates: () => void;
  /** Items the composer's `#` picker offers, with their links resolved. Empty for a board that supplies none. */
  reference_items_with_links: DrawerReferenceItem[];
  /** Loads the earlier versions of an edited comment (or reply when `reply_id` is given), newest edit first. Resolves to none for a mock board. */
  loadCommentRevisions: (comment_id: string, reply_id?: string) => Promise<DrawerCommentRevision[]>;
  /** Feeds a `item_comment_posted` broadcast (see `useCommentPresence`) into the drawer. */
  onRemoteCommentPosted: (event: RemoteCommentEvent) => void;
  /** Ids of comments and replies that arrived through the pill, so the thread can badge them as new for the rest of this session. */
  fresh_comment_ids: string[];
  /** Every attachment across `comments` (top-level only), flattened for the Files tab. */
  all_attachments: DrawerAttachment[];
  info_boxes: DrawerInfoBox[];
  activity_log: DrawerActivityEntry[];

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
  /** Posts one or more files straight away as a bodiless comment — the "attach a file to this card" affordance, independent of whatever text is (or isn't) sitting in the composer. */
  postAttachments: (files: File[]) => void;
  /** True while a `postAttachments` call is in flight — lets the Files tab's dropzone disable itself and show upload feedback. */
  is_uploading_files: boolean;
  /** Set when a `postAttachments` or `deleteAttachment` request fails; shown as a dismissible banner on the Files tab. */
  files_upload_error: string | null;
  dismissFilesUploadError: () => void;
  /** Permanently deletes an item-level attachment (`attachment.can_delete` must be true) — also removes its file from storage server-side. */
  deleteAttachment: (attachment_id: string) => void;

  /** Id of the table (group) the open item currently sits in, or null when unknown. */
  current_group_id: string | null;
  /** False when the open row is a subitem, which hides the move and archive actions. */
  is_top_level_row: boolean;
  /** Outcome of a header "…" menu action that has no dialog of its own to report it in (export and copy link); shown as a dismissible banner under the drawer header. */
  item_action_feedback: DrawerActionFeedback | null;
  dismissItemActionFeedback: () => void;
  /** Downloads the open item's updates (and replies) as an .xlsx workbook. Only available on a real board, see {@link BoardItemDrawerConfig.board_id}. */
  exportUpdates: () => Promise<void>;
  /** Copies the open item's shareable `/boards/{id}/pulses/{item_id}` link to the clipboard. Only available on a real board. */
  copyItemLink: () => Promise<void>;
  /** Each resolves to whether the action succeeded, so the calling dialog can close (or stay open with an error) and the drawer can close. */
  archiveItem: () => Promise<boolean>;
  deleteItem: () => Promise<boolean>;
  moveItemToGroup: (group_id: string) => Promise<boolean>;
  moveItemToBoard: (target_board_id: number, target_group_id: number) => Promise<boolean>;

  reply_text_by_comment: Record<string, string>;
  onReplyTextChange: (comment_id: string, value: string) => void;
  postReply: (comment_id: string) => void;

  mention_target: DrawerComposerTarget | null;
  mention_matches: MentionOption[];
  pickMention: (option: MentionOption) => void;

  /** Which composer's "Notify" people-picker is currently open — separate from `mention_target`, since Notify never touches the body text. */
  notify_target: DrawerComposerTarget | null;
  toggleNotifyPicker: (target: DrawerComposerTarget) => void;
  closeNotifyPicker: () => void;
  /** People picked via "Notify" for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  notified_people_by_target: Record<string, BoardPersonOption[]>;
  pickNotifyPerson: (person: BoardPersonOption) => void;
  removeNotifyPerson: (target: DrawerComposerTarget, person_id: string) => void;

  emoji_palette_target: DrawerComposerTarget | null;
  toggleEmojiPalette: (target: DrawerComposerTarget) => void;
  closeEmojiPalette: () => void;
  insertEmoji: (emoji: string) => void;

  reaction_palette_id: string | null;
  toggleReactionPalette: (id: string) => void;
  closeReactionPalette: () => void;
  toggleReaction: (comment_id: string, reply_id: string | null, emoji: string) => void;

  toggleLike: (comment_id: string, reply_id?: string) => void;
  toggleSeen: (comment_id: string) => void;
  /** Toggles whether a top-level comment is pinned — pinned updates sort ahead of the rest of the thread. */
  togglePin: (comment_id: string) => void;
  /** Deletes a top-level comment, or (when `reply_id` is given) just that reply. Author-only — also enforced server-side. */
  deleteComment: (comment_id: string, reply_id?: string) => void;

  /** `comment.id` while editing a top-level comment, `"commentId:replyId"` while editing a reply (mirrors `reaction_palette_key`) — null when nothing is being edited. */
  editing_key: string | null;
  /** Live draft for whichever comment/reply {@link editing_key} points at. */
  edit_draft: string;
  onEditDraftChange: (value: string) => void;
  /** Opens the inline editor for a top-level comment, or (when `reply_id` is given) a reply — seeds {@link edit_draft} from its current body. Author-only — also enforced server-side. */
  startEditingComment: (comment_id: string, reply_id?: string) => void;
  cancelEditingComment: () => void;
  saveEditedComment: () => void;
};
