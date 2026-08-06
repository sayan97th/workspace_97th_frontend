"use client";
import { useMemo, useRef, useState } from "react";
import { boardCommentsService } from "@/services/board-comments.service";
import type { BoardPersonOption } from "../toolbar/types";
import { mapCommentDtoToDrawerComment, mapCommentDtoToDrawerReply } from "./commentMapping";
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

/** Inserts `@Full Name ` in place of a trailing `@partial` token, or appends it if there's no in-progress mention. */
const insertMention = (text: string, person_name: string): string =>
  MENTION_TRIGGER.test(text) ? text.replace(MENTION_TRIGGER, `@${person_name} `) : `${text}@${person_name} `;

/** Bumps (or removes) a single emoji's reaction pill, toggling whether the current user reacted with it. */
const bumpReaction = (reactions: DrawerReaction[], emoji: string): DrawerReaction[] => {
  const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
  if (index === -1) return [...reactions, { emoji, count: 1, reacted_by_me: true }];
  const current = reactions[index];
  const next_count = current.count + (current.reacted_by_me ? -1 : 1);
  if (next_count <= 0) return reactions.filter((_, existing_index) => existing_index !== index);
  return reactions.map((reaction, existing_index) =>
    existing_index === index ? { ...reaction, count: next_count, reacted_by_me: !current.reacted_by_me } : reaction
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
  const { getRowId, getInitialComments, getInfoBoxes, getActivityLog, getDetailFields, getDescription, board_id } = config;
  const accent_color = config.accent_color ?? DEFAULT_ACCENT_COLOR;
  const is_api_backed = board_id !== undefined;

  const [open_row, setOpenRow] = useState<TRow | null>(null);
  const [active_tab, setActiveTab] = useState<DrawerTabId>("updates");
  const [comments_by_row, setCommentsByRow] = useState<Record<string, DrawerComment[]>>({});
  const [comments_loading, setCommentsLoading] = useState(false);
  const [comments_error, setCommentsError] = useState<string | null>(null);

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
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
    setMentionIdsByTarget({});
    setCommentsError(null);
    setDescriptionDraft(null);

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
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
  };

  const onComposerTextChange = (value: string) => {
    setComposerText(value);
    detectMention("composer", value);
  };

  const onReplyTextChange = (comment_id: string, value: string) => {
    setReplyTextByComment((current) => ({ ...current, [comment_id]: value }));
    detectMention(comment_id, value);
  };

  const pickMention = (person: BoardPersonOption) => {
    if (!mention_target) return;
    if (mention_target === "composer") {
      setComposerText((current) => insertMention(current, person.name));
    } else {
      const target_comment_id = mention_target;
      setReplyTextByComment((current) => ({
        ...current,
        [target_comment_id]: insertMention(current[target_comment_id] ?? "", person.name),
      }));
    }
    setMentionIdsByTarget((current) => ({
      ...current,
      [mention_target]: [...(current[mention_target] ?? []), person.id],
    }));
    setMentionTarget(null);
  };

  const updateComments = (row_id: string, updater: (comments: DrawerComment[]) => DrawerComment[]) =>
    setCommentsByRow((current) => ({ ...current, [row_id]: updater(current[row_id] ?? []) }));

  const postComment = () => {
    if (!open_row_id) return;
    const body = composer_text.trim();
    if (!body && composer_attachment_drafts.length === 0) return;

    if (is_api_backed) {
      const item_id = Number(open_row_id);
      const mentioned_user_ids = (mention_ids_by_target.composer ?? []).map(Number);
      const files = composer_attachment_drafts.map((draft) => draft.file);
      setCommentsError(null);
      boardCommentsService
        .postComment(board_id, item_id, { body, mentioned_user_ids, attachments: files })
        .then((dto) => {
          updateComments(open_row_id, (comments) => [mapCommentDtoToDrawerComment(dto), ...comments]);
          setComposerText("");
          setComposerAttachmentDrafts([]);
          setMentionIdsByTarget((current) => ({ ...current, composer: [] }));
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
      attachments: composer_attachment_drafts.map((draft) => draft.attachment),
      replies: [],
      reactions: [],
    };
    updateComments(open_row_id, (comments) => [new_comment, ...comments]);
    setComposerText("");
    setComposerAttachmentDrafts([]);
    setMentionTarget(null);
  };

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
    if (!body) return;

    if (is_api_backed) {
      const item_id = Number(open_row_id);
      const mentioned_user_ids = (mention_ids_by_target[comment_id] ?? []).map(Number);
      setCommentsError(null);
      boardCommentsService
        .postComment(board_id, item_id, { body, parent_id: Number(comment_id), mentioned_user_ids })
        .then((dto) => {
          const new_reply = mapCommentDtoToDrawerReply(dto);
          updateComments(open_row_id, (comments) =>
            comments.map((comment) =>
              comment.id === comment_id ? { ...comment, replies: [...comment.replies, new_reply] } : comment
            )
          );
          setReplyTextByComment((current) => ({ ...current, [comment_id]: "" }));
          setMentionIdsByTarget((current) => ({ ...current, [comment_id]: [] }));
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

  const insertEmoji = (emoji: string) => {
    if (!emoji_palette_target) return;
    if (emoji_palette_target === "composer") {
      setComposerText((current) => current + emoji);
    } else {
      const target_comment_id = emoji_palette_target;
      setReplyTextByComment((current) => ({ ...current, [target_comment_id]: (current[target_comment_id] ?? "") + emoji }));
    }
    setEmojiPaletteTarget(null);
  };

  const toggleReactionPalette = (id: string) => setReactionPaletteId((current) => (current === id ? null : id));

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

  const toggleReaction = (comment_id: string, reply_id: string | null, emoji: string) => {
    if (!open_row_id) return;
    applyReactionToggle(open_row_id, comment_id, reply_id, emoji);
    setReactionPaletteId(null);

    if (!is_api_backed) return;
    const item_id = Number(open_row_id);
    boardCommentsService
      .toggleReaction(board_id, item_id, Number(reply_id ?? comment_id), emoji)
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

  const mention_matches = useMemo(
    () =>
      mention_target
        ? config.mentionable_people.filter((person) => person.name.toLowerCase().includes(mention_query))
        : [],
    [mention_target, mention_query, config.mentionable_people]
  );

  const comments = open_row_id ? comments_by_row[open_row_id] ?? [] : [];
  const composer_attachments = useMemo(
    () => composer_attachment_drafts.map((draft) => draft.attachment),
    [composer_attachment_drafts]
  );
  const all_attachments = useMemo(() => comments.flatMap((comment) => comment.attachments), [comments]);
  const info_boxes = open_row && getInfoBoxes ? getInfoBoxes(open_row) : [];
  const activity_log = open_row && getActivityLog ? getActivityLog(open_row) : [];
  const detail_fields = open_row && getDetailFields ? getDetailFields(open_row) : [];

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
    detail_fields,

    description,
    has_description,
    onDescriptionChange,

    composer_text,
    composer_attachments,
    onComposerTextChange,
    postComment,
    addComposerAttachments,
    removeComposerAttachment,

    reply_text_by_comment,
    onReplyTextChange,
    postReply,

    mention_target,
    mention_matches,
    pickMention,

    emoji_palette_target,
    toggleEmojiPalette,
    closeEmojiPalette,
    insertEmoji,

    reaction_palette_id,
    toggleReactionPalette,
    toggleReaction,

    toggleLike,
    toggleSeen,
  };
}

export default useBoardItemDrawer;
