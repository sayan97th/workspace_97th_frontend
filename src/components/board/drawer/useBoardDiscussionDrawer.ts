"use client";
import { useMemo, useState } from "react";
import { boardDiscussionService } from "@/services/board-discussion.service";
import type { BoardPersonOption } from "../toolbar/types";
import { mapDiscussionCommentDtoToDrawerComment, mapDiscussionCommentDtoToDrawerReply } from "./discussionCommentMapping";
import { classifyAttachment } from "./drawerAttachments";
import type { DrawerAttachment, DrawerComment, DrawerComposerTarget, DrawerReaction } from "./types";

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

/** Board-specific configuration a caller supplies to {@link useBoardDiscussionDrawer}. */
export type BoardDiscussionDrawerConfig = {
  board_id: number;
  current_user: BoardPersonOption;
  mentionable_people: BoardPersonOption[];
  /** Small breadcrumb line shown under the drawer's "Board Discussion" title, e.g. "Personal · Marketing Plan". */
  breadcrumb_label: string;
};

/** Full live state + actions returned by {@link useBoardDiscussionDrawer}. */
export type BoardDiscussionDrawerApi = BoardDiscussionDrawerConfig & {
  is_open: boolean;
  open: () => void;
  close: () => void;

  comments: DrawerComment[];
  /** True while the board's discussion comments are being fetched. */
  comments_loading: boolean;
  /** Set when a comment/reply/like/reaction/seen/attachment request fails. */
  comments_error: string | null;

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
  /** Deletes a top-level comment, or (when `reply_id` is given) just that reply. Author-only — also enforced server-side. */
  deleteComment: (comment_id: string, reply_id?: string) => void;

  /** `comment.id` while editing a top-level comment, `"commentId:replyId"` while editing a reply — null when nothing is being edited. */
  editing_key: string | null;
  edit_draft: string;
  onEditDraftChange: (value: string) => void;
  startEditingComment: (comment_id: string, reply_id?: string) => void;
  cancelEditingComment: () => void;
  saveEditedComment: () => void;
};

/**
 * Owns all Board Discussion Drawer state — open/closed, the board's flat
 * comment thread, composer drafts, `@mentions`, emoji palettes,
 * likes/reactions/seen — for the "Board updates" button in `BoardHeader`.
 * Mirrors {@link import("./useBoardItemDrawer").useBoardItemDrawer}'s
 * config-in/API-out shape, but without that hook's per-row concept (there's
 * exactly one thread: the whole board's), always persisted through
 * {@link boardDiscussionService} since this drawer only ever opens for a
 * real, saved board.
 */
export function useBoardDiscussionDrawer(config: BoardDiscussionDrawerConfig): BoardDiscussionDrawerApi {
  const { board_id } = config;

  const [is_open, setIsOpen] = useState(false);
  const [comments, setComments] = useState<DrawerComment[]>([]);
  const [comments_loading, setCommentsLoading] = useState(false);
  const [comments_error, setCommentsError] = useState<string | null>(null);
  const [editing_target, setEditingTarget] = useState<{ comment_id: string; reply_id?: string } | null>(null);
  const [edit_draft, setEditDraft] = useState("");

  const [composer_text, setComposerText] = useState("");
  const [composer_attachment_drafts, setComposerAttachmentDrafts] = useState<ComposerAttachmentDraft[]>([]);
  const [reply_text_by_comment, setReplyTextByComment] = useState<Record<string, string>>({});
  /** Ids of people picked via `@mention` for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  const [mention_ids_by_target, setMentionIdsByTarget] = useState<Record<string, string[]>>({});

  const [mention_target, setMentionTarget] = useState<DrawerComposerTarget | null>(null);
  const [mention_query, setMentionQuery] = useState("");
  const [emoji_palette_target, setEmojiPaletteTarget] = useState<DrawerComposerTarget | null>(null);
  const [reaction_palette_id, setReactionPaletteId] = useState<string | null>(null);

  const detectMention = (target: DrawerComposerTarget, value: string) => {
    const match = MENTION_TRIGGER.exec(value);
    if (match) {
      setMentionTarget(target);
      setMentionQuery(match[1].toLowerCase());
    } else if (mention_target === target) {
      setMentionTarget(null);
    }
  };

  const open = () => {
    setIsOpen(true);
    setComposerText("");
    setComposerAttachmentDrafts([]);
    setMentionTarget(null);
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
    setMentionIdsByTarget({});
    setCommentsError(null);
    setEditingTarget(null);
    setEditDraft("");

    setCommentsLoading(true);
    boardDiscussionService
      .listComments(board_id)
      .then((dtos) => setComments(dtos.map(mapDiscussionCommentDtoToDrawerComment)))
      .catch(() => setCommentsError("Couldn't load updates. Please try again."))
      .finally(() => setCommentsLoading(false));
  };

  const close = () => {
    setIsOpen(false);
    setMentionTarget(null);
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

  const postComment = () => {
    const body = composer_text.trim();
    if (!body && composer_attachment_drafts.length === 0) return;

    const mentioned_user_ids = (mention_ids_by_target.composer ?? []).map(Number);
    const files = composer_attachment_drafts.map((draft) => draft.file);
    setCommentsError(null);
    boardDiscussionService
      .postComment(board_id, { body, mentioned_user_ids, attachments: files })
      .then((dto) => {
        setComments((current) => [mapDiscussionCommentDtoToDrawerComment(dto), ...current]);
        setComposerText("");
        setComposerAttachmentDrafts([]);
        setMentionIdsByTarget((current) => ({ ...current, composer: [] }));
      })
      .catch(() => setCommentsError("Couldn't post your update. Please try again."));
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
    const body = (reply_text_by_comment[comment_id] ?? "").trim();
    if (!body) return;

    const mentioned_user_ids = (mention_ids_by_target[comment_id] ?? []).map(Number);
    setCommentsError(null);
    boardDiscussionService
      .postComment(board_id, { body, parent_id: Number(comment_id), mentioned_user_ids })
      .then((dto) => {
        const new_reply = mapDiscussionCommentDtoToDrawerReply(dto);
        setComments((current) =>
          current.map((comment) =>
            comment.id === comment_id ? { ...comment, replies: [...comment.replies, new_reply] } : comment
          )
        );
        setReplyTextByComment((current) => ({ ...current, [comment_id]: "" }));
        setMentionIdsByTarget((current) => ({ ...current, [comment_id]: [] }));
      })
      .catch(() => setCommentsError("Couldn't post your reply. Please try again."));
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
  const applyReactionToggle = (comment_id: string, reply_id: string | null, emoji: string) =>
    setComments((current) =>
      current.map((comment) => {
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
    applyReactionToggle(comment_id, reply_id, emoji);
    setReactionPaletteId(null);

    boardDiscussionService.toggleReaction(board_id, Number(reply_id ?? comment_id), emoji).catch(() => {
      applyReactionToggle(comment_id, reply_id, emoji);
      setCommentsError("Couldn't update that reaction. Please try again.");
    });
  };

  /** Applies (or reverts, by calling it again) the local like toggle for a comment or reply. */
  const applyLikeToggle = (comment_id: string, reply_id?: string) =>
    setComments((current) =>
      current.map((comment) => {
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
    applyLikeToggle(comment_id, reply_id);

    boardDiscussionService.toggleLike(board_id, Number(reply_id ?? comment_id)).catch(() => {
      applyLikeToggle(comment_id, reply_id);
      setCommentsError("Couldn't update that like. Please try again.");
    });
  };

  /** Removes a comment (or, when `reply_id` is given, just that reply) from local state. */
  const removeCommentLocally = (comment_id: string, reply_id?: string) =>
    setComments((current) =>
      reply_id
        ? current.map((comment) =>
            comment.id === comment_id
              ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== reply_id) }
              : comment
          )
        : current.filter((comment) => comment.id !== comment_id)
    );

  const deleteComment = (comment_id: string, reply_id?: string) => {
    const previous_comments = comments;
    removeCommentLocally(comment_id, reply_id);

    boardDiscussionService.deleteComment(board_id, Number(reply_id ?? comment_id)).catch(() => {
      setComments(previous_comments);
      setCommentsError("Couldn't delete that update. Please try again.");
    });
  };

  /** Applies (or reverts, by calling it again with the prior body) a body edit for a comment or reply. */
  const applyBodyEdit = (comment_id: string, reply_id: string | undefined, body: string) =>
    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (!reply_id) return { ...comment, body, is_edited: true };
        return {
          ...comment,
          replies: comment.replies.map((reply) => (reply.id === reply_id ? { ...reply, body, is_edited: true } : reply)),
        };
      })
    );

  const startEditingComment = (comment_id: string, reply_id?: string) => {
    const comment = comments.find((c) => c.id === comment_id);
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
    if (!editing_target) return;
    const { comment_id, reply_id } = editing_target;
    const body = edit_draft.trim();
    if (!body) return;

    const previous_comments = comments;
    applyBodyEdit(comment_id, reply_id, body);
    setEditingTarget(null);
    setEditDraft("");

    boardDiscussionService.updateComment(board_id, Number(reply_id ?? comment_id), body).catch(() => {
      setComments(previous_comments);
      setCommentsError("Couldn't update that update. Please try again.");
    });
  };

  const toggleSeen = (comment_id: string) => {
    setComments((current) =>
      current.map((comment) => (comment.id === comment_id ? { ...comment, seen: !comment.seen } : comment))
    );

    boardDiscussionService.toggleSeen(board_id, Number(comment_id)).catch(() => {
      setComments((current) =>
        current.map((comment) => (comment.id === comment_id ? { ...comment, seen: !comment.seen } : comment))
      );
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

  const composer_attachments = useMemo(
    () => composer_attachment_drafts.map((draft) => draft.attachment),
    [composer_attachment_drafts]
  );

  const editing_key = editing_target
    ? editing_target.reply_id
      ? `${editing_target.comment_id}:${editing_target.reply_id}`
      : editing_target.comment_id
    : null;

  return {
    ...config,
    is_open,
    open,
    close,

    comments,
    comments_loading,
    comments_error,

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
    deleteComment,

    editing_key,
    edit_draft,
    onEditDraftChange,
    startEditingComment,
    cancelEditingComment,
    saveEditedComment,
  };
}

export default useBoardDiscussionDrawer;
