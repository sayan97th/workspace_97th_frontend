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
import type { DrawerAttachment, DrawerComment, DrawerCommentRevision, DrawerComposerTarget, DrawerReaction, DrawerReferenceItem, DrawerReply } from "./types";
import "./board-drawer.css";

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
  /** Files of the update being edited, shown in its edit form. Omit, with the two handlers, to edit text only. */
  edit_attachments?: DrawerAttachment[];
  onAddEditAttachments?: (files: File[]) => void;
  onRemoveEditAttachment?: (attachment_id: string) => void;
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
    <div className="update-card__reactions">
      {reactions.map((reaction) => (
        <ReactionPill key={reaction.emoji} reaction={reaction} onToggle={() => onToggle(reaction.emoji)} />
      ))}
      <button
        ref={add_trigger_ref}
        type="button"
        onClick={onToggleOpen}
        aria-label="Add another reaction"
        aria-expanded={is_palette_open}
        title="Add another reaction"
        className="update-card__add-reaction"
      >
        <ReactSmileyIcon size={13} />
      </button>
      <EmojiPalette anchor_el={add_trigger_ref.current} is_open={is_palette_open} onClose={onClosePalette} onPick={onToggle} mode="react" />
    </div>
  );
};

/** Small marker on an update that arrived live while the drawer was open. */
const NewBadge: React.FC = () => (
  <span className="update-card__badge">New</span>
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
    <div id={`comment-${reply.id}`} className="update-card__reply" data-highlighted={is_highlighted || undefined}>
      <PersonHoverCard person={reply.author} className="flex-none">
        <PersonAvatar person={reply.author} size={30} />
      </PersonHoverCard>
      <div className="update-card__reply-bubble">
        <div className="update-card__reply-box">
          <div className="flex items-center gap-2">
            <div className="update-card__byline">
              <PersonHoverCard person={reply.author}>
                <span className={`update-card__author ${getDeactivatedClass(reply.author.is_deactivated)}`}>{reply.author.name}</span>
              </PersonHoverCard>
              <DeactivatedBadge is_deactivated={reply.author.is_deactivated} />
              <span className="update-card__time">{reply.posted_at}</span>
              {is_new && <NewBadge />}
              {reply.is_edited && <EditedMarker onLoadRevisions={onLoadRevisions} edited_at={reply.edited_at} />}
            </div>
            <CommentOptionsMenu
              onEdit={reply.author.id === current_user_id ? onStartEditing : undefined}
              onDelete={reply.author.id === current_user_id ? onDelete : undefined}
              extra_items={extra_menu_items}
              kind="reply"
              confirm_delete={!has_undo}
            />
          </div>
          {is_editing ? (
            <CommentEditForm value={edit_draft} onChange={onEditDraftChange} onSave={onSaveEditing} onCancel={onCancelEditing} autoFocus />
          ) : (
            <RichTextContent html={reply.body} people={people} className="mt-1" />
          )}
          <ReactionsRow
            reactions={reply.reactions}
            is_palette_open={is_palette_open}
            onToggleOpen={() => onToggleReactionPalette(reaction_palette_key)}
            onClosePalette={onCloseReactionPalette}
            onToggle={onToggleReaction}
          />
        </div>
        <div className="update-card__reply-actions">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={reply.liked_by_me}
            data-active={reply.liked_by_me ? "liked" : undefined}
            className="update-card__reply-action"
          >
            <LikeIcon size={14} filled={reply.liked_by_me} />
            Like{reply.like_count > 0 ? ` · ${reply.like_count}` : ""}
          </button>
          {reply.reactions.length === 0 && (
            <>
              <button
                ref={react_trigger_ref}
                type="button"
                onClick={() => onToggleReactionPalette(reaction_palette_key)}
                aria-expanded={is_palette_open}
                className="update-card__reply-action"
              >
                <ReactSmileyIcon size={14} />
                React
              </button>
              <EmojiPalette
                anchor_el={react_trigger_ref.current}
                is_open={is_palette_open}
                onClose={onCloseReactionPalette}
                onPick={onToggleReaction}
                mode="react"
              />
            </>
          )}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              aria-pressed={reply.bookmarked_by_me ?? false}
              data-active={reply.bookmarked_by_me ? "bookmarked" : undefined}
              className="update-card__reply-action"
            >
              <BookmarkIcon size={14} filled={reply.bookmarked_by_me ?? false} />
              {reply.bookmarked_by_me ? "Bookmarked" : "Bookmark"}
            </button>
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
  edit_attachments,
  onAddEditAttachments,
  onRemoveEditAttachment,
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
  const is_editing_comment = editing_key === comment.id;
  const is_resolved_folded = Boolean(comment.is_resolved) && !is_resolved_open && !is_thread_highlighted && !is_edited_here;

  if (is_resolved_folded) {
    const excerpt = markdownToPlainText(comment.body);
    return (
      <div id={`comment-${comment.id}`} className="update-card update-card--resolved">
        <CheckCircle2 size={18} className="flex-none text-[var(--bd-success-strong)]" aria-hidden="true" />
        <div className="update-card__resolved-text">
          <div className="update-card__resolved-title">
            {comment.author.name}
            {excerpt ? `: ${excerpt.length > RESOLVED_EXCERPT_LENGTH ? `${excerpt.slice(0, RESOLVED_EXCERPT_LENGTH)}...` : excerpt}` : ""}
          </div>
          <div className="update-card__resolved-meta">
            Resolved{comment.resolved_by ? ` by ${comment.resolved_by.name}` : ""}
            {comment.replies.length > 0 ? ` · ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}` : ""}
          </div>
        </div>
        <button type="button" onClick={() => setIsResolvedOpen(true)} className="board-drawer__link-button flex-none">
          Show thread
        </button>
        {can_resolve && collaboration && (
          <button
            type="button"
            onClick={() => collaboration.toggleResolved(comment.id)}
            className="board-drawer__button board-drawer__button--small flex-none"
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
      className="update-card"
      data-pinned={comment.pinned || undefined}
      data-highlighted={highlighted_id === comment.id || undefined}
    >
      <div className="update-card__main">
        {comment.is_resolved && (
          <div className="update-card__flag" data-tone="resolved">
            <CheckCircle2 size={13} aria-hidden="true" />
            Resolved{comment.resolved_by ? ` by ${comment.resolved_by.name}` : ""}
            <button type="button" onClick={() => setIsResolvedOpen(false)} className="board-drawer__link-button ml-auto">
              Hide thread
            </button>
          </div>
        )}
        {comment.pinned && (
          <div className="update-card__flag" data-tone="pinned">
            <PinIcon size={12} />
            Pinned to top
          </div>
        )}
        <div className="update-card__header">
          <PersonHoverCard person={comment.author} className="flex-none">
            <PersonAvatar person={comment.author} size={36} />
          </PersonHoverCard>
          <div className="update-card__byline">
            <PersonHoverCard person={comment.author}>
              <span className={`update-card__author ${getDeactivatedClass(comment.author.is_deactivated)}`}>{comment.author.name}</span>
            </PersonHoverCard>
            <DeactivatedBadge is_deactivated={comment.author.is_deactivated} />
            <span className="update-card__time">{comment.posted_at}</span>
            {fresh_comment_ids.includes(comment.id) && <NewBadge />}
            {comment.is_edited && (
              <EditedMarker
                onLoadRevisions={onLoadRevisions ? () => onLoadRevisions(comment.id) : undefined}
                edited_at={comment.edited_at}
              />
            )}
          </div>
          <div className="update-card__tools">
            <div className="update-card__seen-summary">
              <SeenByList seen_by={comment.seen_by} />
              <span className="update-card__meta-item" title={`Viewed by ${comment.view_count}`} aria-label={`Viewed by ${comment.view_count}`}>
                <ViewsIcon />
                {comment.view_count}
              </span>
            </div>
            <span className="update-card__tools-divider" aria-hidden="true" />
            {collaboration && (
              <button
                type="button"
                onClick={() => collaboration.toggleBookmark(comment.id)}
                aria-label={comment.bookmarked_by_me ? "Remove bookmark" : "Bookmark update"}
                aria-pressed={comment.bookmarked_by_me ?? false}
                title={comment.bookmarked_by_me ? "Remove bookmark" : "Bookmark update"}
                data-tone={comment.bookmarked_by_me ? "bookmarked" : undefined}
                className="update-card__tool"
              >
                <BookmarkIcon size={15} filled={comment.bookmarked_by_me ?? false} />
              </button>
            )}
            {can_resolve && collaboration && (
              <button
                type="button"
                onClick={() => collaboration.toggleResolved(comment.id)}
                aria-label={comment.is_resolved ? "Reopen thread" : "Resolve thread"}
                aria-pressed={comment.is_resolved ?? false}
                title={comment.is_resolved ? "Reopen thread" : "Resolve thread"}
                data-tone={comment.is_resolved ? "resolved" : undefined}
                className="update-card__tool"
              >
                <CheckCircle2 size={16} />
              </button>
            )}
            {can_pin && onTogglePin && (
              <button
                type="button"
                onClick={() => onTogglePin(comment.id)}
                aria-label={comment.pinned ? "Unpin update" : "Pin to top"}
                aria-pressed={comment.pinned}
                title={comment.pinned ? "Unpin update" : "Pin to top"}
                data-tone={comment.pinned ? "pinned" : undefined}
                className="update-card__tool"
              >
                <PinIcon size={15} />
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
        </div>

        {is_editing_comment ? (
          <CommentEditForm
            value={edit_draft}
            onChange={onEditDraftChange}
            onSave={onSaveEditing}
            onCancel={onCancelEditing}
            autoFocus
            attachments={edit_attachments}
            onAddFiles={onAddEditAttachments}
            onRemoveAttachment={onRemoveEditAttachment}
          />
        ) : (
          <RichTextContent html={comment.body} people={mentionable_people} className="update-card__body" />
        )}

        {/* While editing, the form lists the files instead, with a remove button each. */}
        {!is_editing_comment && comment.attachments.length > 0 && (
          <div className="update-card__attachments">
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

      </div>

      <div className="update-card__actions">
        <button
          type="button"
          onClick={() => onToggleLike(comment.id)}
          aria-pressed={comment.liked_by_me}
          data-active={comment.liked_by_me ? "liked" : undefined}
          className="update-card__action"
        >
          <LikeIcon filled={comment.liked_by_me} />
          Like{comment.like_count > 0 ? ` · ${comment.like_count}` : ""}
        </button>
        {comment.reactions.length === 0 && (
          <span className="update-card__action-wrap">
            <button
              ref={react_trigger_ref}
              type="button"
              onClick={() => onToggleReactionPalette(comment.id)}
              aria-expanded={is_palette_open}
              className="update-card__action"
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
        <button type="button" onClick={focusReplyComposer} className="update-card__action">
          <ReplyIcon />
          Reply
        </button>
        <button
          type="button"
          onClick={() => onToggleSeen(comment.id)}
          aria-pressed={comment.seen}
          data-active={comment.seen ? "seen" : undefined}
          className="update-card__action"
        >
          <SeenIcon />
          {comment.seen ? "Seen" : "Mark as seen"}
        </button>
      </div>

      {comment.replies.length > 0 && (
        <div className="update-card__replies">
          {are_replies_folded && (
            <button type="button" onClick={() => setAreRepliesExpanded(true)} className="update-card__replies-toggle">
              View {hidden_reply_count} earlier {hidden_reply_count === 1 ? "reply" : "replies"}
            </button>
          )}
          {is_collapsible && are_replies_expanded && (
            <button type="button" onClick={() => setAreRepliesExpanded(false)} className="update-card__replies-toggle">
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

      <div ref={reply_composer_ref} className="update-card__reply-composer">
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
