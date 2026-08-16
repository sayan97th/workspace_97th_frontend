"use client";
import React, { useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { LikeIcon, ReactSmileyIcon, ReplyIcon, SeenIcon, ViewsIcon } from "@/icons/drawer-icons";
import CommentAttachmentChip from "./CommentAttachmentChip";
import CommentComposer from "./CommentComposer";
import CommentEditForm from "./CommentEditForm";
import CommentOptionsMenu from "./CommentOptionsMenu";
import EmojiPalette from "./EmojiPalette";
import { formatReactorNames } from "./reactionFormatting";
import { renderMentionText } from "./renderMentionText";
import type { DrawerComment, DrawerComposerTarget, DrawerReaction, DrawerReply } from "./types";

export type CommentThreadProps = {
  comment: DrawerComment;
  current_user: BoardPersonOption;
  onToggleLike: (comment_id: string, reply_id?: string) => void;
  onToggleSeen: (comment_id: string) => void;
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
  mention_matches: BoardPersonOption[];
  onPickMention: (person: BoardPersonOption) => void;
  emoji_palette_target: DrawerComposerTarget | null;
  onToggleEmojiPalette: (target: DrawerComposerTarget) => void;
  onCloseEmojiPalette: () => void;
  onInsertEmoji: (emoji: string) => void;
};

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
 * one way to open the picker (never two competing triggers). Each pill's
 * `title` surfaces who reacted, and clicking a pill toggles the current
 * user's own reaction for that emoji, so a comment can carry any number of
 * different emoji, each from any number of people, at once.
 */
const ReactionsRow: React.FC<ReactionsRowProps> = ({ reactions, is_palette_open, onToggleOpen, onClosePalette, onToggle }) => {
  const add_trigger_ref = useRef<HTMLButtonElement>(null);

  if (reactions.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          title={`${formatReactorNames(reaction.reactor_names)} reacted with ${reaction.emoji}`}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors"
          style={{
            background: reaction.reacted_by_me ? "rgba(87,155,252,0.18)" : "var(--color-shell-hover)",
            borderColor: reaction.reacted_by_me ? "#579bfc" : "var(--color-shell-border-strong)",
          }}
        >
          <span className="text-sm">{reaction.emoji}</span>
          {reaction.count}
        </button>
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

type ReplyRowProps = {
  reply: DrawerReply;
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
};

const ReplyRow: React.FC<ReplyRowProps> = ({
  reply,
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
}) => {
  const react_trigger_ref = useRef<HTMLButtonElement>(null);
  const is_palette_open = reaction_palette_id === reaction_palette_key;

  return (
    <div className="flex gap-2.5 py-3 pl-5 pr-4">
      <PersonAvatar person={reply.author} size={27} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-shell-text">{reply.author.name}</span>
          <span className="text-[11px] text-shell-text-faint">{reply.posted_at}</span>
          {reply.is_edited && <span className="text-[11px] text-shell-text-faint">(edited)</span>}
          {reply.author.id === current_user_id && (
            <span className="ml-auto">
              <CommentOptionsMenu onEdit={onStartEditing} onDelete={onDelete} kind="reply" />
            </span>
          )}
        </div>
        {is_editing ? (
          <CommentEditForm value={edit_draft} onChange={onEditDraftChange} onSave={onSaveEditing} onCancel={onCancelEditing} autoFocus />
        ) : (
          <div className="mt-1 text-[13px] leading-[1.55] text-shell-text-secondary">{renderMentionText(reply.body)}</div>
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
  emoji_palette_target,
  onToggleEmojiPalette,
  onCloseEmojiPalette,
  onInsertEmoji,
}) => {
  const reply_composer_ref = useRef<HTMLDivElement>(null);
  const react_trigger_ref = useRef<HTMLButtonElement>(null);
  const is_palette_open = reaction_palette_id === comment.id;

  const focusReplyComposer = () => reply_composer_ref.current?.querySelector("textarea")?.focus();

  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-shell-border bg-shell-panel-alt">
      <div className="px-4 pb-[13px] pt-[15px]">
        <div className="flex items-center gap-2.5">
          <PersonAvatar person={comment.author} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13.5px] font-bold text-shell-text">{comment.author.name}</span>
              {comment.is_edited && <span className="text-[11px] text-shell-text-faint">(edited)</span>}
            </div>
            <div className="text-[11.5px] text-shell-text-faint">{comment.posted_at}</div>
          </div>
          <span className="flex items-center gap-1.5 text-[11.5px] text-shell-text-faint">
            <ViewsIcon />
            {comment.view_count}
          </span>
          {comment.author.id === current_user.id && (
            <CommentOptionsMenu onEdit={() => onStartEditing(comment.id)} onDelete={() => onDeleteComment(comment.id)} kind="comment" />
          )}
        </div>

        {editing_key === comment.id ? (
          <CommentEditForm value={edit_draft} onChange={onEditDraftChange} onSave={onSaveEditing} onCancel={onCancelEditing} autoFocus />
        ) : (
          <div className="mt-2.5 text-[13.5px] leading-relaxed text-shell-text-secondary">{renderMentionText(comment.body)}</div>
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
          <button
            type="button"
            onClick={() => onToggleSeen(comment.id)}
            className="ml-auto flex items-center gap-1.5 text-[12.5px] font-semibold"
            style={{ color: comment.seen ? "#00c875" : "var(--color-shell-text-muted)" }}
          >
            <SeenIcon />
            {comment.seen ? "Seen" : "Mark as seen"}
          </button>
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="border-t border-shell-border bg-shell-hover py-1">
          {comment.replies.map((reply) => (
            <ReplyRow
              key={reply.id}
              reply={reply}
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
          emoji_palette_target={emoji_palette_target}
          onToggleEmojiPalette={onToggleEmojiPalette}
          onCloseEmojiPalette={onCloseEmojiPalette}
          onInsertEmoji={onInsertEmoji}
        />
      </div>
    </div>
  );
};

export default CommentThread;
