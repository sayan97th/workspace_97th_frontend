"use client";
import { useMemo, useRef, useState } from "react";
import { boardCommentsService } from "@/services/board-comments.service";
import { boardItemAttachmentsService } from "@/services/board-item-attachments.service";
import type { BoardPersonOption } from "../toolbar/types";
import { mapCommentDtoToDrawerComment, mapCommentDtoToDrawerReply, mapItemAttachmentDto } from "./commentMapping";
import { classifyAttachment } from "./drawerAttachments";
import type {
  BoardItemDrawerApi,
  BoardItemDrawerConfig,
  DrawerAttachment,
  DrawerComment,
  DrawerComposerTarget,
  DrawerReaction,
  DrawerReply,
  DrawerTabId,
} from "./types";

const DEFAULT_ACCENT_COLOR = "#00c875";
const DESCRIPTION_AUTOSAVE_DELAY_MS = 800;

const createId = () => Math.random().toString(36).slice(2, 10);

const MENTION_TRIGGER = /@([\w]*)$/;

/** A rich text composer's Markdown body counts as empty when it's got no visible text and no inline image (`![alt](url)`). */
const isRichTextEmpty = (markdown: string): boolean => markdown.trim().length === 0 && !markdown.includes("![");

/** Bumps (or removes) a single emoji's reaction pill, toggling whether the current user reacted with it — a comment can carry any number of these in parallel, one per distinct emoji. */
const bumpReaction = (reactions: DrawerReaction[], emoji: string): DrawerReaction[] => {
  const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
  if (index === -1) return [...reactions, { emoji, count: 1, reacted_by_me: true, reactor_names: ["You"] }];
  const current = reactions[index];
  const next_reacted_by_me = !current.reacted_by_me;
  const next_count = current.count + (next_reacted_by_me ? 1 : -1);
  if (next_count <= 0) return reactions.filter((_, existing_index) => existing_index !== index);
  const next_reactor_names = next_reacted_by_me
    ? [...current.reactor_names, "You"]
    : current.reactor_names.filter((name) => name !== "You");
  return reactions.map((reaction, existing_index) =>
    existing_index === index
      ? { ...reaction, count: next_count, reacted_by_me: next_reacted_by_me, reactor_names: next_reactor_names }
      : reaction
  );
};

type ComposerAttachmentDraft = { attachment: DrawerAttachment; file: File };

/**
 * Owns all Board Item Drawer state — open/closed row, active tab, comment threads,
 * composer drafts, `@mentions`, emoji palettes, likes/reactions/seen — so any board
 * view can open a rich, commentable drawer for one of its rows with a single hook.
 * Mirrors the `useBoardToolbar` config-in/API-out pattern used across `@/components/board`.
 *
 * When `config.board_id` is set, comments are persisted through
 * {@link boardCommentsService} against the real Laravel backend; otherwise (e.g.
 * Client Hub) everything stays local, synchronous mock state exactly as before.
 */
export function useBoardItemDrawer<TRow>(config: BoardItemDrawerConfig<TRow>): BoardItemDrawerApi<TRow> {
  const { getRowId, getInitialComments, getInfoBoxes, getActivityLog, getDescription, board_id } = config;
  const accent_color = config.accent_color ?? DEFAULT_ACCENT_COLOR;
  const is_api_backed = board_id !== undefined;

  const [open_row, setOpenRow] = useState<TRow | null>(null);
  const [active_tab, setActiveTab] = useState<DrawerTabId>("updates");
  const [comments_by_row, setCommentsByRow] = useState<Record<string, DrawerComment[]>>({});
  const [comments_loading, setCommentsLoading] = useState(false);
  // Files attached directly to the item (the "Attachments" affordance) —
  // kept separate from `comments_by_row` so uploading one never shows up as
  // a blank entry in the Comments feed. See `postAttachments` below.
  const [item_attachments_by_row, setItemAttachmentsByRow] = useState<Record<string, DrawerAttachment[]>>({});
  const [comments_error, setCommentsError] = useState<string | null>(null);
  const [is_uploading_files, setIsUploadingFiles] = useState(false);
  const [files_upload_error, setFilesUploadError] = useState<string | null>(null);
  const [editing_target, setEditingTarget] = useState<{ comment_id: string; reply_id?: string } | null>(null);
  const [edit_draft, setEditDraft] = useState("");

  // Local draft that wins over `getDescription(open_row)` once the viewer has
  // typed — `null` means "no unsaved edit yet, defer to the row's own value".
  // Reset to `null` on every `openRow` and flushed (skipping the debounce) on
  // `close`, mirroring `BoardDocView`'s autosave so a fast close right after
  // typing can't silently drop the last edit.
  const [description_draft, setDescriptionDraft] = useState<string | null>(null);
  const description_save_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const description_flush_ref = useRef<() => void>(() => {});

  const [composer_text, setComposerText] = useState("");
  const [composer_attachment_drafts, setComposerAttachmentDrafts] = useState<ComposerAttachmentDraft[]>([]);
  const [reply_text_by_comment, setReplyTextByComment] = useState<Record<string, string>>({});
  /** Ids of people picked via `@mention` for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  const [mention_ids_by_target, setMentionIdsByTarget] = useState<Record<string, string[]>>({});

  const [mention_target, setMentionTarget] = useState<DrawerComposerTarget | null>(null);
  const [mention_query, setMentionQuery] = useState("");
  const [notify_target, setNotifyTarget] = useState<DrawerComposerTarget | null>(null);
  /** Ids of people picked via "Notify" for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  const [notified_ids_by_target, setNotifiedIdsByTarget] = useState<Record<string, string[]>>({});
  const [emoji_palette_target, setEmojiPaletteTarget] = useState<DrawerComposerTarget | null>(null);
  const [reaction_palette_id, setReactionPaletteId] = useState<string | null>(null);

  const id_seq_ref = useRef(0);
  const nextCommentId = () => {
    id_seq_ref.current += 1;
    return `c${id_seq_ref.current}-${createId()}`;
  };

  const open_row_id = open_row ? getRowId(open_row) : null;
  const open_row_title = open_row ? config.getRowTitle(open_row) : "";

  const detectMention = (target: DrawerComposerTarget, value: string) => {
    // `value` is the composer's Markdown body — plain text, so the trigger
    // regex can run directly against it without stripping any markup first.
    const match = MENTION_TRIGGER.exec(value);
    if (match) {
      setMentionTarget(target);
      setMentionQuery(match[1].toLowerCase());
    } else if (mention_target === target) {
      setMentionTarget(null);
    }
  };

  const openRow = (row: TRow) => {
    description_flush_ref.current();
    const row_id = getRowId(row);
    setOpenRow(row);
    setActiveTab("updates");
    setComposerText("");
    setComposerAttachmentDrafts([]);
    setMentionTarget(null);
    setNotifyTarget(null);
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
    setMentionIdsByTarget({});
    setNotifiedIdsByTarget({});
    setCommentsError(null);
    setFilesUploadError(null);
    setDescriptionDraft(null);
    setEditingTarget(null);
    setEditDraft("");

    if (is_api_backed) {
      const item_id = Number(row_id);
      setCommentsLoading(true);
      boardCommentsService
        .listComments(board_id, item_id)
        .then((dtos) => {
          setCommentsByRow((current) => ({ ...current, [row_id]: dtos.map(mapCommentDtoToDrawerComment) }));
        })
        .catch(() => setCommentsError("Couldn't load comments. Please try again."))
        .finally(() => setCommentsLoading(false));

      boardItemAttachmentsService
        .listAttachments(board_id, item_id)
        .then((dtos) => {
          setItemAttachmentsByRow((current) => ({ ...current, [row_id]: dtos.map(mapItemAttachmentDto) }));
        })
        .catch(() => setFilesUploadError("Couldn't load attachments. Please try again."));
    } else {
      setCommentsByRow((current) =>
        current[row_id] ? current : { ...current, [row_id]: getInitialComments(row) }
      );
    }
  };

  const close = () => {
    description_flush_ref.current();
    setOpenRow(null);
    setMentionTarget(null);
    setNotifyTarget(null);
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
    setEditingTarget(null);
    setEditDraft("");
  };

  const onComposerTextChange = (value: string) => {
    setComposerText(value);
    detectMention("composer", value);
  };

  const onReplyTextChange = (comment_id: string, value: string) => {
    setReplyTextByComment((current) => ({ ...current, [comment_id]: value }));
    detectMention(comment_id, value);
  };

  // Text insertion itself happens in `RichTextComposer` (via its imperative
  // ref, called by `CommentComposer`), since only the live editor instance
  // knows where the cursor actually is — this only tracks which ids the
  // in-progress draft has mentioned, for the eventual `postComment()` payload.
  const pickMention = (person: BoardPersonOption) => {
    if (!mention_target) return;
    setMentionIdsByTarget((current) => ({
      ...current,
      [mention_target]: [...(current[mention_target] ?? []), person.id],
    }));
    setMentionTarget(null);
  };

  const toggleNotifyPicker = (target: DrawerComposerTarget) =>
    setNotifyTarget((current) => (current === target ? null : target));
  const closeNotifyPicker = () => setNotifyTarget(null);

  /** Adds `person` to the notify list for whichever composer/reply the picker is currently open for — a no-op if they're already on it. */
  const pickNotifyPerson = (person: BoardPersonOption) => {
    if (!notify_target) return;
    setNotifiedIdsByTarget((current) => {
      const existing = current[notify_target] ?? [];
      if (existing.includes(person.id)) return current;
      return { ...current, [notify_target]: [...existing, person.id] };
    });
    setNotifyTarget(null);
  };

  const removeNotifyPerson = (target: DrawerComposerTarget, person_id: string) =>
    setNotifiedIdsByTarget((current) => ({
      ...current,
      [target]: (current[target] ?? []).filter((id) => id !== person_id),
    }));

  const notified_people_by_target = useMemo(() => {
    const result: Record<string, BoardPersonOption[]> = {};
    for (const [target, ids] of Object.entries(notified_ids_by_target)) {
      result[target] = ids
        .map((id) => config.mentionable_people.find((person) => person.id === id))
        .filter((person): person is BoardPersonOption => person !== undefined);
    }
    return result;
  }, [notified_ids_by_target, config.mentionable_people]);

  const updateComments = (row_id: string, updater: (comments: DrawerComment[]) => DrawerComment[]) =>
    setCommentsByRow((current) => ({ ...current, [row_id]: updater(current[row_id] ?? []) }));

  const postComment = () => {
    if (!open_row_id) return;
    const body = composer_text.trim();
    if (isRichTextEmpty(body) && composer_attachment_drafts.length === 0) return;

    if (is_api_backed) {
      const item_id = Number(open_row_id);
      const mentioned_user_ids = (mention_ids_by_target.composer ?? []).map(Number);
      const notified_user_ids = (notified_ids_by_target.composer ?? []).map(Number);
      const files = composer_attachment_drafts.map((draft) => draft.file);
      setCommentsError(null);
      boardCommentsService
        .postComment(board_id, item_id, { body, mentioned_user_ids, notified_user_ids, attachments: files })
        .then((dto) => {
          updateComments(open_row_id, (comments) => [mapCommentDtoToDrawerComment(dto), ...comments]);
          setComposerText("");
          setComposerAttachmentDrafts([]);
          setMentionIdsByTarget((current) => ({ ...current, composer: [] }));
          setNotifiedIdsByTarget((current) => ({ ...current, composer: [] }));
        })
        .catch(() => setCommentsError("Couldn't post your update. Please try again."));
      return;
    }

    const new_comment: DrawerComment = {
      id: nextCommentId(),
      author: config.current_user,
      posted_at: "Just now",
      body,
      view_count: 1,
      liked_by_me: false,
      like_count: 0,
      seen: false,
      seen_by: [],
      attachments: composer_attachment_drafts.map((draft) => draft.attachment),
      replies: [],
      reactions: [],
    };
    updateComments(open_row_id, (comments) => [new_comment, ...comments]);
    setComposerText("");
    setComposerAttachmentDrafts([]);
    setMentionTarget(null);
  };

  const updateItemAttachments = (row_id: string, updater: (attachments: DrawerAttachment[]) => DrawerAttachment[]) =>
    setItemAttachmentsByRow((current) => ({ ...current, [row_id]: updater(current[row_id] ?? []) }));

  /**
   * Uploads `files` straight onto the item — used by the dedicated
   * Attachments affordance (Kanban's paperclip button, the Files tab's
   * dropzone), which shouldn't depend on (or interfere with) whatever the
   * viewer may currently be typing into the main composer. Persisted through
   * `boardItemAttachmentsService` (a real item-level attachment), never as a
   * comment, so it never shows up as a blank entry in the Comments feed.
   * Tracked through its own {@link is_uploading_files}/{@link files_upload_error}
   * rather than the composer's `comments_error`, since a Files-tab upload
   * can fail while the viewer is looking at a tab that never renders the
   * composer's banner.
   */
  const postAttachments = (files: File[]) => {
    if (!open_row_id || files.length === 0) return;

    if (is_api_backed) {
      const item_id = Number(open_row_id);
      setFilesUploadError(null);
      setIsUploadingFiles(true);
      boardItemAttachmentsService
        .uploadAttachments(board_id, item_id, files)
        .then((dtos) => {
          updateItemAttachments(open_row_id, (attachments) => [...dtos.map(mapItemAttachmentDto), ...attachments]);
        })
        .catch(() => setFilesUploadError("Couldn't upload one or more files. Please try again."))
        .finally(() => setIsUploadingFiles(false));
      return;
    }

    const new_attachments: DrawerAttachment[] = files.map((file) => ({
      id: createId(),
      file_name: file.name,
      ...classifyAttachment(file.name),
    }));
    updateItemAttachments(open_row_id, (attachments) => [...new_attachments, ...attachments]);
  };

  /**
   * Permanently deletes an item-level attachment (id shaped `item-{id}` by
   * {@link mapItemAttachmentDto}) — comment attachments have no per-file
   * delete route yet, so callers must gate this behind `attachment.can_delete`.
   * Optimistic, mirroring {@link deleteComment}: removes locally first, then
   * rolls back and surfaces {@link files_upload_error} if the request fails.
   */
  const deleteAttachment = (attachment_id: string) => {
    if (!open_row_id) return;
    const row_id = open_row_id;
    const previous_attachments = item_attachments_by_row[row_id] ?? [];
    updateItemAttachments(row_id, (attachments) => attachments.filter((attachment) => attachment.id !== attachment_id));

    if (!is_api_backed) return;
    const item_id = Number(row_id);
    const numeric_attachment_id = Number(attachment_id.replace(/^item-/, ""));
    setFilesUploadError(null);
    boardItemAttachmentsService
      .deleteAttachment(board_id, item_id, numeric_attachment_id)
      .catch(() => {
        setItemAttachmentsByRow((current) => ({ ...current, [row_id]: previous_attachments }));
        setFilesUploadError("Couldn't delete that file. Please try again.");
      });
  };

  const dismissFilesUploadError = () => setFilesUploadError(null);

  const addComposerAttachments = (files: File[]) => {
    if (files.length === 0) return;
    const additions: ComposerAttachmentDraft[] = files.map((file) => ({
      attachment: { id: createId(), file_name: file.name, ...classifyAttachment(file.name) },
      file,
    }));
    setComposerAttachmentDrafts((current) => [...current, ...additions]);
  };

  const removeComposerAttachment = (attachment_id: string) =>
    setComposerAttachmentDrafts((current) => current.filter((draft) => draft.attachment.id !== attachment_id));

  const postReply = (comment_id: string) => {
    if (!open_row_id) return;
    const body = (reply_text_by_comment[comment_id] ?? "").trim();
    if (isRichTextEmpty(body)) return;

    if (is_api_backed) {
      const item_id = Number(open_row_id);
      const mentioned_user_ids = (mention_ids_by_target[comment_id] ?? []).map(Number);
      const notified_user_ids = (notified_ids_by_target[comment_id] ?? []).map(Number);
      setCommentsError(null);
      boardCommentsService
        .postComment(board_id, item_id, { body, parent_id: Number(comment_id), mentioned_user_ids, notified_user_ids })
        .then((dto) => {
          const new_reply = mapCommentDtoToDrawerReply(dto);
          updateComments(open_row_id, (comments) =>
            comments.map((comment) =>
              comment.id === comment_id ? { ...comment, replies: [...comment.replies, new_reply] } : comment
            )
          );
          setReplyTextByComment((current) => ({ ...current, [comment_id]: "" }));
          setMentionIdsByTarget((current) => ({ ...current, [comment_id]: [] }));
          setNotifiedIdsByTarget((current) => ({ ...current, [comment_id]: [] }));
        })
        .catch(() => setCommentsError("Couldn't post your reply. Please try again."));
      return;
    }

    const new_reply: DrawerReply = {
      id: nextCommentId(),
      author: config.current_user,
      posted_at: "Just now",
      body,
      view_count: 1,
      liked_by_me: false,
      like_count: 0,
      reactions: [],
    };
    updateComments(open_row_id, (comments) =>
      comments.map((comment) =>
        comment.id === comment_id ? { ...comment, replies: [...comment.replies, new_reply] } : comment
      )
    );
    setReplyTextByComment((current) => ({ ...current, [comment_id]: "" }));
    setMentionTarget(null);
  };

  const toggleEmojiPalette = (target: DrawerComposerTarget) =>
    setEmojiPaletteTarget((current) => (current === target ? null : target));
  const closeEmojiPalette = () => setEmojiPaletteTarget(null);

  // The actual emoji insertion happens in `RichTextComposer` (via its
  // imperative ref, called by `CommentComposer`) — this only closes the
  // palette, same as `EmojiPalette`'s own `onClose` already does.
  const insertEmoji = () => setEmojiPaletteTarget(null);

  const toggleReactionPalette = (id: string) => setReactionPaletteId((current) => (current === id ? null : id));
  const closeReactionPalette = () => setReactionPaletteId(null);

  /** Applies (or reverts, by calling it again) the local reaction toggle for a comment or reply. */
  const applyReactionToggle = (row_id: string, comment_id: string, reply_id: string | null, emoji: string) =>
    updateComments(row_id, (comments) =>
      comments.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (reply_id === null) return { ...comment, reactions: bumpReaction(comment.reactions, emoji) };
        return {
          ...comment,
          replies: comment.replies.map((reply) =>
            reply.id === reply_id ? { ...reply, reactions: bumpReaction(reply.reactions, emoji) } : reply
          ),
        };
      })
    );

  /** Replaces a comment or reply's reactions with the server's authoritative list — called once a toggle request resolves, so any drift from the optimistic guess (an overlapping request, a stale retry) self-heals immediately instead of lingering until the next full reload. */
  const applyServerReactions = (row_id: string, comment_id: string, reply_id: string | null, reactions: DrawerReaction[]) =>
    updateComments(row_id, (comments) =>
      comments.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (reply_id === null) return { ...comment, reactions };
        return {
          ...comment,
          replies: comment.replies.map((reply) => (reply.id === reply_id ? { ...reply, reactions } : reply)),
        };
      })
    );

  const toggleReaction = (comment_id: string, reply_id: string | null, emoji: string) => {
    if (!open_row_id) return;
    applyReactionToggle(open_row_id, comment_id, reply_id, emoji);
    setReactionPaletteId(null);

    if (!is_api_backed) return;
    const item_id = Number(open_row_id);
    boardCommentsService
      .toggleReaction(board_id, item_id, Number(reply_id ?? comment_id), emoji)
      .then((dto) => applyServerReactions(open_row_id, comment_id, reply_id, dto.reactions))
      .catch(() => {
        applyReactionToggle(open_row_id, comment_id, reply_id, emoji);
        setCommentsError("Couldn't update that reaction. Please try again.");
      });
  };

  /** Applies (or reverts, by calling it again) the local like toggle for a comment or reply. */
  const applyLikeToggle = (row_id: string, comment_id: string, reply_id?: string) =>
    updateComments(row_id, (comments) =>
      comments.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (!reply_id) {
          const liked_by_me = !comment.liked_by_me;
          return { ...comment, liked_by_me, like_count: Math.max(0, comment.like_count + (liked_by_me ? 1 : -1)) };
        }
        return {
          ...comment,
          replies: comment.replies.map((reply) => {
            if (reply.id !== reply_id) return reply;
            const liked_by_me = !reply.liked_by_me;
            return { ...reply, liked_by_me, like_count: Math.max(0, reply.like_count + (liked_by_me ? 1 : -1)) };
          }),
        };
      })
    );

  const toggleLike = (comment_id: string, reply_id?: string) => {
    if (!open_row_id) return;
    applyLikeToggle(open_row_id, comment_id, reply_id);

    if (!is_api_backed) return;
    const item_id = Number(open_row_id);
    boardCommentsService
      .toggleLike(board_id, item_id, Number(reply_id ?? comment_id))
      .catch(() => {
        applyLikeToggle(open_row_id, comment_id, reply_id);
        setCommentsError("Couldn't update that like. Please try again.");
      });
  };

  /** Removes a comment (or, when `reply_id` is given, just that reply) from local state. */
  const removeCommentLocally = (row_id: string, comment_id: string, reply_id?: string) =>
    updateComments(row_id, (comments) =>
      reply_id
        ? comments.map((comment) =>
            comment.id === comment_id
              ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== reply_id) }
              : comment
          )
        : comments.filter((comment) => comment.id !== comment_id)
    );

  const deleteComment = (comment_id: string, reply_id?: string) => {
    if (!open_row_id) return;
    const row_id = open_row_id;
    const previous_comments = comments_by_row[row_id] ?? [];
    removeCommentLocally(row_id, comment_id, reply_id);

    if (!is_api_backed) return;
    const item_id = Number(row_id);
    boardCommentsService
      .deleteComment(board_id, item_id, Number(reply_id ?? comment_id))
      .catch(() => {
        setCommentsByRow((current) => ({ ...current, [row_id]: previous_comments }));
        setCommentsError("Couldn't delete that comment. Please try again.");
      });
  };

  /** Applies (or reverts, by calling it again with the prior body) a body edit for a comment or reply. */
  const applyBodyEdit = (row_id: string, comment_id: string, reply_id: string | undefined, body: string) =>
    updateComments(row_id, (comments) =>
      comments.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (!reply_id) return { ...comment, body, is_edited: true };
        return {
          ...comment,
          replies: comment.replies.map((reply) => (reply.id === reply_id ? { ...reply, body, is_edited: true } : reply)),
        };
      })
    );

  const startEditingComment = (comment_id: string, reply_id?: string) => {
    if (!open_row_id) return;
    const comment = (comments_by_row[open_row_id] ?? []).find((c) => c.id === comment_id);
    const target = reply_id ? comment?.replies.find((reply) => reply.id === reply_id) : comment;
    if (!target) return;
    setEditingTarget({ comment_id, reply_id });
    setEditDraft(target.body);
  };

  const onEditDraftChange = (value: string) => setEditDraft(value);

  const cancelEditingComment = () => {
    setEditingTarget(null);
    setEditDraft("");
  };

  const saveEditedComment = () => {
    if (!open_row_id || !editing_target) return;
    const row_id = open_row_id;
    const { comment_id, reply_id } = editing_target;
    const body = edit_draft.trim();
    if (isRichTextEmpty(body)) return;

    const previous_comments = comments_by_row[row_id] ?? [];
    applyBodyEdit(row_id, comment_id, reply_id, body);
    setEditingTarget(null);
    setEditDraft("");

    if (!is_api_backed) return;
    const item_id = Number(row_id);
    boardCommentsService
      .updateComment(board_id, item_id, Number(reply_id ?? comment_id), body)
      .catch(() => {
        setCommentsByRow((current) => ({ ...current, [row_id]: previous_comments }));
        setCommentsError("Couldn't update that comment. Please try again.");
      });
  };

  const applySeenToggle = (row_id: string, comment_id: string) =>
    updateComments(row_id, (comments) =>
      comments.map((comment) => (comment.id === comment_id ? { ...comment, seen: !comment.seen } : comment))
    );

  const toggleSeen = (comment_id: string) => {
    if (!open_row_id) return;
    applySeenToggle(open_row_id, comment_id);

    if (!is_api_backed) return;
    const item_id = Number(open_row_id);
    boardCommentsService
      .toggleSeen(board_id, item_id, Number(comment_id))
      .catch(() => {
        applySeenToggle(open_row_id, comment_id);
        setCommentsError("Couldn't update seen state. Please try again.");
      });
  };

  const applyPinToggle = (row_id: string, comment_id: string) =>
    updateComments(row_id, (comments) =>
      comments.map((comment) => (comment.id === comment_id ? { ...comment, pinned: !comment.pinned } : comment))
    );

  const togglePin = (comment_id: string) => {
    if (!open_row_id) return;
    applyPinToggle(open_row_id, comment_id);

    if (!is_api_backed) return;
    const item_id = Number(open_row_id);
    boardCommentsService
      .togglePin(board_id, item_id, Number(comment_id))
      .catch(() => {
        applyPinToggle(open_row_id, comment_id);
        setCommentsError("Couldn't update pinned state. Please try again.");
      });
  };

  const mention_matches = useMemo(
    () =>
      mention_target
        ? config.mentionable_people.filter((person) => person.name.toLowerCase().includes(mention_query))
        : [],
    [mention_target, mention_query, config.mentionable_people]
  );

  const comments = open_row_id ? comments_by_row[open_row_id] ?? [] : [];
  const item_attachments = open_row_id ? item_attachments_by_row[open_row_id] ?? [] : [];
  const composer_attachments = useMemo(
    () => composer_attachment_drafts.map((draft) => draft.attachment),
    [composer_attachment_drafts]
  );
  // Every attachment on the item: files uploaded directly (the dedicated
  // Attachments affordance) plus files sent along with a real comment — the
  // Attachments/Files tab shows both, while `comments` itself only ever
  // holds genuinely authored updates.
  const all_attachments = useMemo(
    () => [...item_attachments, ...comments.flatMap((comment) => comment.attachments)],
    [item_attachments, comments]
  );
  const info_boxes = open_row && getInfoBoxes ? getInfoBoxes(open_row) : [];
  const activity_log = open_row && getActivityLog ? getActivityLog(open_row) : [];

  const editing_key = editing_target
    ? editing_target.reply_id
      ? `${editing_target.comment_id}:${editing_target.reply_id}`
      : editing_target.comment_id
    : null;

  const has_description = getDescription !== undefined;
  const description = description_draft ?? (open_row && getDescription ? getDescription(open_row) : "");

  // Kept in a ref (rather than a plain closure passed to `setTimeout`) so
  // `openRow`/`close` can always flush whatever the *latest* pending edit
  // is, even though those functions are defined above this point in the
  // hook and can't see values computed here directly.
  description_flush_ref.current = () => {
    if (description_save_timeout_ref.current) clearTimeout(description_save_timeout_ref.current);
    if (description_draft === null || !open_row_id) return;
    config.onDescriptionChange?.(open_row_id, description_draft);
  };

  const onDescriptionChange = (value: string) => {
    setDescriptionDraft(value);
    if (description_save_timeout_ref.current) clearTimeout(description_save_timeout_ref.current);
    description_save_timeout_ref.current = setTimeout(() => {
      if (open_row_id) config.onDescriptionChange?.(open_row_id, value);
    }, DESCRIPTION_AUTOSAVE_DELAY_MS);
  };

  return {
    ...config,
    accent_color,
    is_open: open_row !== null,
    open_row_id,
    open_row_title,
    active_tab,

    openRow,
    close,
    setActiveTab,

    comments,
    comments_loading,
    comments_error,
    all_attachments,
    info_boxes,
    activity_log,

    description,
    has_description,
    onDescriptionChange,

    composer_text,
    composer_attachments,
    onComposerTextChange,
    postComment,
    addComposerAttachments,
    removeComposerAttachment,
    postAttachments,
    is_uploading_files,
    files_upload_error,
    dismissFilesUploadError,
    deleteAttachment,

    reply_text_by_comment,
    onReplyTextChange,
    postReply,

    mention_target,
    mention_matches,
    pickMention,

    notify_target,
    toggleNotifyPicker,
    closeNotifyPicker,
    notified_people_by_target,
    pickNotifyPerson,
    removeNotifyPerson,

    emoji_palette_target,
    toggleEmojiPalette,
    closeEmojiPalette,
    insertEmoji,

    reaction_palette_id,
    toggleReactionPalette,
    closeReactionPalette,
    toggleReaction,

    toggleLike,
    toggleSeen,
    togglePin,
    deleteComment,

    editing_key,
    edit_draft,
    onEditDraftChange,
    startEditingComment,
    cancelEditingComment,
    saveEditedComment,
  };
}

export default useBoardItemDrawer;
