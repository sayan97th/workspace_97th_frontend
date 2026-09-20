"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import DeactivatedBadge from "../DeactivatedBadge";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import PersonHoverCard from "@/components/people/PersonHoverCard";
import type { AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import { PinIcon } from "@/icons/board-icons";
import { LikeIcon, QuoteIcon, ReactSmileyIcon, ReplyIcon, SeenIcon, ViewsIcon } from "@/icons/drawer-icons";
import { BookmarkIcon, LinkIcon } from "@/icons/workspace-icons";
import CommentAttachmentChip from "./CommentAttachmentChip";
import { useCommentCollaborationContext } from "./CommentCollaborationContext";
import { markdownToPlainText } from "./commentFilters";
import CommentComposer from "./CommentComposer";
import CommentEditForm from "./CommentEditForm";
import CommentOptionsMenu from "./CommentOptionsMenu";
import EditedMarker from "./EditedMarker";
import EmojiPalette from "./EmojiPalette";
import type { MentionOption } from "./mentionOptions";
import ReactionPill from "./ReactionPill";
import RichTextContent from "./RichTextContent";
import SeenByList from "./SeenByList";
import type { DrawerComment, DrawerCommentRevision, DrawerComposerTarget, DrawerReaction, DrawerReferenceItem, DrawerReply } from "./types";

export type CommentThreadProps = {
  comment: DrawerComment;
  current_user: BoardPersonOption;
  onToggleLike: (comment_id: string, reply_id?: string) => void;
  onToggleSeen: (comment_id: string) => void;
  onTogglePin?: (comment_id: string) => void;
  onDeleteComment: (comment_id: string, reply_id?: string) => void;
  editing_key: string | null;
  edit_draft: string;
  onEditDraftChange: (value: string) => void;
  onStartEditing: (comment_id: string, reply_id?: string) => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  reaction_palette_id: string | null;
  onToggleReactionPalette: (id: string) => void;
  onCloseReactionPalette: () => void;
  onToggleReaction: (comment_id: string, reply_id: string | null, emoji: string) => void;
  reply_value: string;
  onReplyChange: (value: string) => void;
  onPostReply: () => void;
  mention_target: DrawerComposerTarget | null;
  mention_matches: MentionOption[];
  onPickMention: (option: MentionOption) => void;
  mentionable_people?: BoardPersonOption[];
  /** Ids of comments and replies that arrived live through the "N new updates" pill, badged "New". */
  fresh_comment_ids?: string[];
  notify_target?: DrawerComposerTarget | null;
  onToggleNotifyPicker?: (target: DrawerComposerTarget) => void;
  onCloseNotifyPicker?: () => void;
  onPickNotifyPerson?: (person: BoardPersonOption) => void;
  notified_people?: BoardPersonOption[];
  onRemoveNotifyPerson?: (target: DrawerComposerTarget, person_id: string) => void;
  emoji_palette_target: DrawerComposerTarget | null;
  onToggleEmojiPalette: (target: DrawerComposerTarget) => void;
  onCloseEmojiPalette: () => void;
  onInsertEmoji: (emoji: string) => void;
  /** Loads the earlier versions of an edited comment (or reply, when `reply_id` is given). Omit to show a plain "(edited)" label. */
  onLoadRevisions?: (comment_id: string, reply_id?: string) => Promise<DrawerCommentRevision[]>;
  /** Items the reply box's `#` picker can link to. */
  reference_items?: DrawerReferenceItem[];
};

/** A thread with more replies than this folds its older ones behind a "View N earlier replies" button. */
const COLLAPSE_REPLIES_OVER = 3;
/** How many of the newest replies stay visible while the older ones are folded. */
const VISIBLE_REPLY_TAIL = 2;
/** How much of an update's text the collapsed "Resolved" row quotes. */
const RESOLVED_EXCERPT_LENGTH = 120;

type ReactionsRowProps = {
  reactions: DrawerReaction[];
  is_palette_open: boolean;
  onToggleOpen: () => void;
  onClosePalette: () => void;
  onToggle: (emoji: string) => void;
};

/**
 * A comment or reply's reaction pills, plus a trailing "+" that opens the
 * same Slack-style quick-react popover as the action row's "React" trigger —
 * only rendered once at least one reaction exists, so there's always exactly
 * one way to open the picker (never two competing triggers). Hovering a pill
 * lists who reacted (see {@link ReactionPill}), and clicking it toggles the current
 * user's own reaction for that emoji, so a comment can carry any number of
 * different emoji, each from any number of people, at once.
 */
const ReactionsRow: React.FC<ReactionsRowProps> = ({ reactions, is_palette_open, onToggleOpen, onClosePalette, onToggle }) => {
  const add_trigger_ref = useRef<HTMLButtonElement>(null);

  if (reactions.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {reactions.map((reaction) => (
        <ReactionPill key={reaction.emoji} reaction={reaction} onToggle={() => onToggle(reaction.emoji)} />
      ))}
      <button
        ref={add_trigger_ref}
        type="button"
        onClick={onToggleOpen}
        aria-label="Add another reaction"
        title="Add another reaction"
        className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-dashed text-shell-text-faint transition-colors hover:border-solid hover:border-shell-border-strong hover:text-shell-text-secondary hover:bg-shell-hover ${
          is_palette_open ? "border-solid border-shell-border-strong bg-shell-hover text-shell-text-secondary" : "border-shell-border"
        }`}
      >
        <ReactSmileyIcon size={13} />
      </button>
      <EmojiPalette anchor_el={add_trigger_ref.current} is_open={is_palette_open} onClose={onClosePalette} onPick={onToggle} mode="react" />
    </div>
  );
};

/** Small marker on an update that arrived live while the drawer was open. */
const NewBadge: React.FC = () => (
  <span className="rounded-[5px] bg-[rgba(0,200,117,0.16)] px-[5px] py-px text-[9.5px] font-bold uppercase tracking-wide text-[#00c875]">
    New
  </span>
);

type ReplyRowProps = {
  reply: DrawerReply;
  people?: BoardPersonOption[];
  is_new?: boolean;
  current_user_id: string;
  onLike: () => void;
  onDelete: () => void;
  onStartEditing: () => void;
  is_editing: boolean;
  edit_draft: string;
  onEditDraftChange: (value: string) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  reaction_palette_id: string | null;
  reaction_palette_key: string;
  onToggleReactionPalette: (id: string) => void;
  onCloseReactionPalette: () => void;
  onToggleReaction: (emoji: string) => void;
  onLoadRevisions?: () => Promise<DrawerCommentRevision[]>;
  /** Copy link and quote, offered to everyone next to the author's own Edit and Delete. */
  extra_menu_items?: AnchoredMenuItem[];
  onToggleBookmark?: () => void;
  /** A deep link points at this reply, so it is outlined for a few seconds. */
  is_highlighted?: boolean;
  /** The drawer offers "Undo" after a delete, so the confirm dialog is skipped. */
  has_undo?: boolean;
};

const ReplyRow: React.FC<ReplyRowProps> = ({
  reply,
  people,
  is_new,
  current_user_id,
  onLike,
  onDelete,
  onStartEditing,
  is_editing,
  edit_draft,
  onEditDraftChange,
  onSaveEditing,
  onCancelEditing,
  reaction_palette_id,
  reaction_palette_key,
  onToggleReactionPalette,
  onCloseReactionPalette,
  onToggleReaction,
  onLoadRevisions,
  extra_menu_items,
  onToggleBookmark,
  is_highlighted = false,
  has_undo = false,
}) => {
  const react_trigger_ref = useRef<HTMLButtonElement>(null);
  const is_palette_open = reaction_palette_id === reaction_palette_key;

  return (
    <div
      id={`comment-${reply.id}`}
      className={`flex gap-2.5 py-3 pl-5 pr-4 transition-shadow ${is_highlighted ? "shadow-[inset_0_0_0_2px_#579bfc]" : ""}`}
    >
      <PersonHoverCard person={reply.author} className="flex-none">
        <PersonAvatar person={reply.author} size={27} />
      </PersonHoverCard>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PersonHoverCard person={reply.author}>
            <span className={`text-[12.5px] font-bold text-shell-text ${getDeactivatedClass(reply.author.is_deactivated)}`}>{reply.author.name}</span>
          </PersonHoverCard>
          <DeactivatedBadge is_deactivated={reply.author.is_deactivated} />
          <span className="text-[11px] text-shell-text-faint">{reply.posted_at}</span>
          {is_new && <NewBadge />}
          {reply.is_edited && <EditedMarker onLoadRevisions={onLoadRevisions} edited_at={reply.edited_at} />}
          <span className="ml-auto">
            <CommentOptionsMenu
              onEdit={reply.author.id === current_user_id ? onStartEditing : undefined}
              onDelete={reply.author.id === current_user_id ? onDelete : undefined}
              extra_items={extra_menu_items}
              kind="reply"
              confirm_delete={!has_undo}
            />
          </span>
        </div>
        {is_editing ? (
          <CommentEditForm value={edit_draft} onChange={onEditDraftChange} onSave={onSaveEditing} onCancel={onCancelEditing} autoFocus />
        ) : (
          <RichTextContent html={reply.body} people={people} className="mt-1 text-[13px] leading-[1.55] text-shell-text-secondary" />
        )}
        <ReactionsRow
          reactions={reply.reactions}
          is_palette_open={is_palette_open}
          onToggleOpen={() => onToggleReactionPalette(reaction_palette_key)}
          onClosePalette={onCloseReactionPalette}
          onToggle={onToggleReaction}
        />
        <div className="mt-[7px] flex items-center gap-3.5">
          <button
            type="button"
            onClick={onLike}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold"
            style={{ color: reply.liked_by_me ? "#579bfc" : "var(--color-shell-text-muted)" }}
          >
            <LikeIcon size={13} filled={reply.liked_by_me} />
            Like{reply.like_count > 0 ? ` · ${reply.like_count}` : ""}
          </button>
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              aria-pressed={reply.bookmarked_by_me ?? false}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold"
              style={{ color: reply.bookmarked_by_me ? "#7fb2ff" : "var(--color-shell-text-muted)" }}
            >
              <BookmarkIcon size={13} filled={reply.bookmarked_by_me ?? false} />
              {reply.bookmarked_by_me ? "Bookmarked" : "Bookmark"}
            </button>
          )}
          {reply.reactions.length === 0 && (
            <span className="relative">
              <button
                ref={react_trigger_ref}
                type="button"
                onClick={() => onToggleReactionPalette(reaction_palette_key)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-shell-text-muted hover:text-shell-text-secondary"
              >
                <ReactSmileyIcon size={13} />
                React
              </button>
              <EmojiPalette
                anchor_el={react_trigger_ref.current}
                is_open={is_palette_open}
                onClose={onCloseReactionPalette}
                onPick={onToggleReaction}
                mode="react"
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/** One update thread card: the main comment, its replies, and an always-visible reply composer. */
const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  current_user,
  onToggleLike,
  onToggleSeen,
  onTogglePin,
  onDeleteComment,
  editing_key,
  edit_draft,
  onEditDraftChange,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  reaction_palette_id,
  onToggleReactionPalette,
  onCloseReactionPalette,
  onToggleReaction,
  reply_value,
  onReplyChange,
  onPostReply,
  mention_target,
  mention_matches,
  onPickMention,
  mentionable_people,
  fresh_comment_ids = [],
  notify_target,
  onToggleNotifyPicker,
  onCloseNotifyPicker,
  onPickNotifyPerson,
  notified_people,
  onRemoveNotifyPerson,
  emoji_palette_target,
  onToggleEmojiPalette,
  onCloseEmojiPalette,
  onInsertEmoji,
  onLoadRevisions,
  reference_items,
}) => {
  const reply_composer_ref = useRef<HTMLDivElement>(null);
  const react_trigger_ref = useRef<HTMLButtonElement>(null);
  const is_palette_open = reaction_palette_id === comment.id;
  const collaboration = useCommentCollaborationContext();
  // A resolved thread stays folded to one row until it is opened, and a long one keeps only its newest replies in view.
  const [is_resolved_open, setIsResolvedOpen] = useState(false);
  const [are_replies_expanded, setAreRepliesExpanded] = useState(false);

  const focusReplyComposer = () =>
    (reply_composer_ref.current?.querySelector(".ProseMirror") as HTMLElement | null)?.focus();

  // Copy link and quote for a comment (or one of its replies), offered to everyone.
  const buildExtraItems = (reply_id?: string): AnchoredMenuItem[] =>
    collaboration
      ? [
          {
            key: "copy-link",
            label: collaboration.copied_link_id === (reply_id ?? comment.id) ? "Link copied" : "Copy link",
            icon: <LinkIcon size={14} />,
            onClick: () => void collaboration.copyCommentLink(comment.id, reply_id),
          },
          {
            key: "quote",
            label: "Quote in reply",
            icon: <QuoteIcon size={14} />,
            onClick: () => {
              collaboration.quoteComment(comment.id, reply_id);
              requestAnimationFrame(() => reply_composer_ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
            },
          },
        ]
      : [];

  // A deep link to this comment, or one of its replies, scrolls the thread into view once it has loaded.
  const highlighted_id = collaboration?.highlighted_comment_id ?? null;
  const is_thread_highlighted = highlighted_id !== null && (highlighted_id === comment.id || comment.replies.some((reply) => reply.id === highlighted_id));
  useEffect(() => {
    if (!is_thread_highlighted || highlighted_id === null) return;
    const frame_id = requestAnimationFrame(() =>
      document.getElementById(`comment-${highlighted_id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })
    );
    return () => cancelAnimationFrame(frame_id);
  }, [is_thread_highlighted, highlighted_id]);
  const can_pin = onTogglePin !== undefined && (collaboration?.can_edit ?? true);
  const can_resolve = collaboration !== null && collaboration.can_edit;

  // Replies are folded when there are many, unless something in the hidden part needs to be seen.
  const is_collapsible = comment.replies.length > COLLAPSE_REPLIES_OVER;
  const hidden_reply_count = comment.replies.length - VISIBLE_REPLY_TAIL;
  const hidden_replies = comment.replies.slice(0, hidden_reply_count);
  const is_hidden_reply_needed =
    is_collapsible &&
    (hidden_replies.some((reply) => reply.id === highlighted_id || `${comment.id}:${reply.id}` === editing_key) ||
      hidden_replies.some((reply) => fresh_comment_ids.includes(reply.id)));
  const are_replies_folded = is_collapsible && !are_replies_expanded && !is_hidden_reply_needed;
  const visible_replies = are_replies_folded ? comment.replies.slice(hidden_reply_count) : comment.replies;

  // A deep link into a resolved thread, or editing it, opens it.
  const is_edited_here = editing_key !== null && (editing_key === comment.id || editing_key.startsWith(`${comment.id}:`));
  const is_resolved_folded = Boolean(comment.is_resolved) && !is_resolved_open && !is_thread_highlighted && !is_edited_here;

  if (is_resolved_folded) {
    const excerpt = markdownToPlainText(comment.body);
    return (
      <div
        id={`comment-${comment.id}`}
        className="mt-4 flex items-center gap-2.5 rounded-[14px] border border-shell-border bg-shell-panel-alt px-4 py-3"
      >
        <CheckCircle2 size={17} className="flex-none text-[#00c875]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold text-shell-text-secondary">
            {comment.author.name}
            {excerpt ? `: ${excerpt.length > RESOLVED_EXCERPT_LENGTH ? `${excerpt.slice(0, RESOLVED_EXCERPT_LENGTH)}...` : excerpt}` : ""}
          </div>
          <div className="text-[11.5px] text-shell-text-faint">
            Resolved{comment.resolved_by ? ` by ${comment.resolved_by.name}` : ""}
            {comment.replies.length > 0 ? ` · ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}` : ""}
          </div>
        </div>
        <button type="button" onClick={() => setIsResolvedOpen(true)} className="flex-none text-[12px] font-semibold text-[#7fb2ff] hover:text-[#9cc4ff]">
          Show thread
        </button>
        {can_resolve && collaboration && (
          <button
            type="button"
            onClick={() => collaboration.toggleResolved(comment.id)}
            className="flex-none rounded-md border border-shell-border px-2 py-0.5 text-[12px] font-semibold text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
          >
            Reopen
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={`mt-4 overflow-hidden rounded-[14px] border bg-shell-panel-alt transition-shadow ${
        comment.pinned ? "border-[#f5a623]" : "border-shell-border"
      } ${highlighted_id === comment.id ? "shadow-[0_0_0_2px_#579bfc]" : ""}`}
    >
      <div className="px-4 pb-[13px] pt-[15px]">
        {comment.is_resolved && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#00c875]">
            <CheckCircle2 size={12} aria-hidden="true" />
            Resolved{comment.resolved_by ? ` by ${comment.resolved_by.name}` : ""}
            <button
              type="button"
              onClick={() => setIsResolvedOpen(false)}
              className="ml-auto text-[11px] font-semibold normal-case tracking-normal text-shell-text-muted hover:text-shell-text"
            >
              Hide thread
            </button>
          </div>
        )}
        {comment.pinned && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#f5a623]">
            <PinIcon size={11} />
            Pinned
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <PersonHoverCard person={comment.author} className="flex-none">
            <PersonAvatar person={comment.author} size={32} />
          </PersonHoverCard>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <PersonHoverCard person={comment.author}>
                <span className={`text-[13.5px] font-bold text-shell-text ${getDeactivatedClass(comment.author.is_deactivated)}`}>{comment.author.name}</span>
              </PersonHoverCard>
              <DeactivatedBadge is_deactivated={comment.author.is_deactivated} />
              {fresh_comment_ids.includes(comment.id) && <NewBadge />}
              {comment.is_edited && (
                <EditedMarker
                  onLoadRevisions={onLoadRevisions ? () => onLoadRevisions(comment.id) : undefined}
                  edited_at={comment.edited_at}
                />
              )}
            </div>
            <div className="text-[11.5px] text-shell-text-faint">{comment.posted_at}</div>
          </div>
          <span className="flex items-center gap-1.5 text-[11.5px] text-shell-text-faint">
            <ViewsIcon />
            {comment.view_count}
          </span>
          {collaboration && (
            <button
              type="button"
              onClick={() => collaboration.toggleBookmark(comment.id)}
              aria-label={comment.bookmarked_by_me ? "Remove bookmark" : "Bookmark update"}
              aria-pressed={comment.bookmarked_by_me ?? false}
              title={comment.bookmarked_by_me ? "Remove bookmark" : "Bookmark update"}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-shell-hover"
              style={{ color: comment.bookmarked_by_me ? "#7fb2ff" : "var(--color-shell-text-muted)" }}
            >
              <BookmarkIcon size={13} filled={comment.bookmarked_by_me ?? false} />
            </button>
          )}
          {can_resolve && collaboration && (
            <button
              type="button"
              onClick={() => collaboration.toggleResolved(comment.id)}
              aria-label={comment.is_resolved ? "Reopen thread" : "Resolve thread"}
              aria-pressed={comment.is_resolved ?? false}
              title={comment.is_resolved ? "Reopen thread" : "Resolve thread"}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-shell-hover"
              style={{ color: comment.is_resolved ? "#00c875" : "var(--color-shell-text-muted)" }}
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          {can_pin && onTogglePin && (
            <button
              type="button"
              onClick={() => onTogglePin(comment.id)}
              aria-label={comment.pinned ? "Unpin update" : "Pin update"}
              aria-pressed={comment.pinned}
              title={comment.pinned ? "Unpin update" : "Pin update"}
              className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-shell-hover"
              style={{ color: comment.pinned ? "#f5a623" : "var(--color-shell-text-muted)" }}
            >
              <PinIcon size={13} />
            </button>
          )}
          <CommentOptionsMenu
            onEdit={comment.author.id === current_user.id ? () => onStartEditing(comment.id) : undefined}
            onDelete={comment.author.id === current_user.id ? () => onDeleteComment(comment.id) : undefined}
            extra_items={buildExtraItems()}
            kind="comment"
            confirm_delete={collaboration === null}
          />
        </div>

        {editing_key === comment.id ? (
          <CommentEditForm value={edit_draft} onChange={onEditDraftChange} onSave={onSaveEditing} onCancel={onCancelEditing} autoFocus />
        ) : (
          <RichTextContent html={comment.body} people={mentionable_people} className="mt-2.5 text-[13.5px] leading-relaxed text-shell-text-secondary" />
        )}

        {comment.attachments.length > 0 && (
          <div className="mt-[11px] flex flex-wrap gap-2">
            {comment.attachments.map((attachment) => (
              <CommentAttachmentChip key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        <ReactionsRow
          reactions={comment.reactions}
          is_palette_open={is_palette_open}
          onToggleOpen={() => onToggleReactionPalette(comment.id)}
          onClosePalette={onCloseReactionPalette}
          onToggle={(emoji) => onToggleReaction(comment.id, null, emoji)}
        />

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onToggleLike(comment.id)}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold"
            style={{ color: comment.liked_by_me ? "#579bfc" : "var(--color-shell-text-muted)" }}
          >
            <LikeIcon filled={comment.liked_by_me} />
            Like{comment.like_count > 0 ? ` · ${comment.like_count}` : ""}
          </button>
          {comment.reactions.length === 0 && (
            <span className="relative">
              <button
                ref={react_trigger_ref}
                type="button"
                onClick={() => onToggleReactionPalette(comment.id)}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-shell-text-muted hover:text-shell-text-secondary"
              >
                <ReactSmileyIcon />
                React
              </button>
              <EmojiPalette
                anchor_el={react_trigger_ref.current}
                is_open={is_palette_open}
                onClose={onCloseReactionPalette}
                onPick={(emoji) => onToggleReaction(comment.id, null, emoji)}
                mode="react"
              />
            </span>
          )}
          <button
            type="button"
            onClick={focusReplyComposer}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-shell-text-muted hover:text-shell-text-secondary"
          >
            <ReplyIcon />
            Reply
          </button>
          <div className="ml-auto flex items-center gap-2.5">
            <SeenByList seen_by={comment.seen_by} />
            <button
              type="button"
              onClick={() => onToggleSeen(comment.id)}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold"
              style={{ color: comment.seen ? "#00c875" : "var(--color-shell-text-muted)" }}
            >
              <SeenIcon />
              {comment.seen ? "Seen" : "Mark as seen"}
            </button>
          </div>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="border-t border-shell-border bg-shell-hover py-1">
          {are_replies_folded && (
            <button
              type="button"
              onClick={() => setAreRepliesExpanded(true)}
              className="w-full px-5 py-2 text-left text-[12px] font-semibold text-[#7fb2ff] hover:text-[#9cc4ff]"
            >
              View {hidden_reply_count} earlier {hidden_reply_count === 1 ? "reply" : "replies"}
            </button>
          )}
          {is_collapsible && are_replies_expanded && (
            <button
              type="button"
              onClick={() => setAreRepliesExpanded(false)}
              className="w-full px-5 py-2 text-left text-[12px] font-semibold text-shell-text-muted hover:text-shell-text"
            >
              Show fewer replies
            </button>
          )}
          {visible_replies.map((reply) => (
            <ReplyRow
              key={reply.id}
              reply={reply}
              people={mentionable_people}
              is_new={fresh_comment_ids.includes(reply.id)}
              current_user_id={current_user.id}
              onLike={() => onToggleLike(comment.id, reply.id)}
              onDelete={() => onDeleteComment(comment.id, reply.id)}
              onStartEditing={() => onStartEditing(comment.id, reply.id)}
              is_editing={editing_key === `${comment.id}:${reply.id}`}
              edit_draft={edit_draft}
              onEditDraftChange={onEditDraftChange}
              onSaveEditing={onSaveEditing}
              onCancelEditing={onCancelEditing}
              reaction_palette_id={reaction_palette_id}
              reaction_palette_key={`${comment.id}:${reply.id}`}
              onToggleReactionPalette={onToggleReactionPalette}
              onCloseReactionPalette={onCloseReactionPalette}
              onToggleReaction={(emoji) => onToggleReaction(comment.id, reply.id, emoji)}
              onLoadRevisions={onLoadRevisions ? () => onLoadRevisions(comment.id, reply.id) : undefined}
              extra_menu_items={buildExtraItems(reply.id)}
              onToggleBookmark={collaboration ? () => collaboration.toggleBookmark(comment.id, reply.id) : undefined}
              is_highlighted={highlighted_id === reply.id}
              has_undo={collaboration !== null}
            />
          ))}
        </div>
      )}

      <div ref={reply_composer_ref} className="border-t border-shell-border py-3 pl-5 pr-4">
        <CommentComposer
          target={comment.id}
          avatar_person={current_user}
          value={reply_value}
          onChange={onReplyChange}
          onSubmit={onPostReply}
          placeholder="Write a reply and mention others with @"
          submit_label="Reply"
          variant="reply"
          mention_target={mention_target}
          mention_matches={mention_matches}
          onPickMention={onPickMention}
          mentionable_people={mentionable_people}
          notify_target={notify_target}
          onToggleNotifyPicker={onToggleNotifyPicker}
          onCloseNotifyPicker={onCloseNotifyPicker}
          onPickNotifyPerson={onPickNotifyPerson}
          notified_people={notified_people}
          onRemoveNotifyPerson={onRemoveNotifyPerson ? (person_id) => onRemoveNotifyPerson(comment.id, person_id) : undefined}
          emoji_palette_target={emoji_palette_target}
          onToggleEmojiPalette={onToggleEmojiPalette}
          onCloseEmojiPalette={onCloseEmojiPalette}
          onInsertEmoji={onInsertEmoji}
          reference_items={reference_items}
          quote_request={collaboration?.quote_requests[comment.id]}
        />
      </div>
    </div>
  );
};

export default CommentThread;
