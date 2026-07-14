"use client";
import { useMemo, useRef, useState } from "react";
import type { BoardPersonOption } from "../toolbar/types";
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

/**
 * Owns all Board Item Drawer state — open/closed row, active tab, comment threads,
 * composer drafts, `@mentions`, emoji palettes, likes/reactions/seen — so any board
 * view can open a rich, commentable drawer for one of its rows with a single hook.
 * Mirrors the `useBoardToolbar` config-in/API-out pattern used across `@/components/board`.
 */
export function useBoardItemDrawer<TRow>(config: BoardItemDrawerConfig<TRow>): BoardItemDrawerApi<TRow> {
  const { getRowId, getInitialComments, getInfoBoxes, getActivityLog } = config;
  const accent_color = config.accent_color ?? DEFAULT_ACCENT_COLOR;

  const [open_row, setOpenRow] = useState<TRow | null>(null);
  const [active_tab, setActiveTab] = useState<DrawerTabId>("updates");
  const [comments_by_row, setCommentsByRow] = useState<Record<string, DrawerComment[]>>({});

  const [composer_text, setComposerText] = useState("");
  const [composer_attachments, setComposerAttachments] = useState<DrawerAttachment[]>([]);
  const [reply_text_by_comment, setReplyTextByComment] = useState<Record<string, string>>({});

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
    const row_id = getRowId(row);
    setCommentsByRow((current) =>
      current[row_id] ? current : { ...current, [row_id]: getInitialComments(row) }
    );
    setOpenRow(row);
    setActiveTab("updates");
    setComposerText("");
    setComposerAttachments([]);
    setMentionTarget(null);
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
  };

  const close = () => {
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
    setMentionTarget(null);
  };

  const updateComments = (row_id: string, updater: (comments: DrawerComment[]) => DrawerComment[]) =>
    setCommentsByRow((current) => ({ ...current, [row_id]: updater(current[row_id] ?? []) }));

  const postComment = () => {
    if (!open_row_id) return;
    const body = composer_text.trim();
    if (!body && composer_attachments.length === 0) return;
    const new_comment: DrawerComment = {
      id: nextCommentId(),
      author: config.current_user,
      posted_at: "Just now",
      body,
      view_count: 1,
      liked_by_me: false,
      like_count: 0,
      seen: false,
      attachments: composer_attachments,
      replies: [],
      reactions: [],
    };
    updateComments(open_row_id, (comments) => [new_comment, ...comments]);
    setComposerText("");
    setComposerAttachments([]);
    setMentionTarget(null);
  };

  const addComposerAttachments = (files: File[]) => {
    if (files.length === 0) return;
    const additions: DrawerAttachment[] = files.map((file) => ({
      id: createId(),
      file_name: file.name,
      ...classifyAttachment(file.name),
    }));
    setComposerAttachments((current) => [...current, ...additions]);
  };

  const removeComposerAttachment = (attachment_id: string) =>
    setComposerAttachments((current) => current.filter((attachment) => attachment.id !== attachment_id));

  const postReply = (comment_id: string) => {
    if (!open_row_id) return;
    const body = (reply_text_by_comment[comment_id] ?? "").trim();
    if (!body) return;
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

  const toggleReaction = (comment_id: string, reply_id: string | null, emoji: string) => {
    if (!open_row_id) return;
    updateComments(open_row_id, (comments) =>
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
    setReactionPaletteId(null);
  };

  const toggleLike = (comment_id: string, reply_id?: string) => {
    if (!open_row_id) return;
    updateComments(open_row_id, (comments) =>
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
  };

  const toggleSeen = (comment_id: string) => {
    if (!open_row_id) return;
    updateComments(open_row_id, (comments) =>
      comments.map((comment) => (comment.id === comment_id ? { ...comment, seen: !comment.seen } : comment))
    );
  };

  const mention_matches = useMemo(
    () =>
      mention_target
        ? config.mentionable_people.filter((person) => person.name.toLowerCase().includes(mention_query))
        : [],
    [mention_target, mention_query, config.mentionable_people]
  );

  const comments = open_row_id ? comments_by_row[open_row_id] ?? [] : [];
  const info_boxes = open_row && getInfoBoxes ? getInfoBoxes(open_row) : [];
  const activity_log = open_row && getActivityLog ? getActivityLog(open_row) : [];

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
    info_boxes,
    activity_log,

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
